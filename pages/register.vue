<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from '@/types'

definePageMeta({
  layout: 'auth'
})

const supabase: SupabaseClient<Database> = useSupabaseClient()

const email = ref<string>('')
const username = ref<string>('')
const password = ref<string>('')
const confirmPassword = ref<string>('')

const emailStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')

// сброс статуса при редактировании email (чтобы индикатор не вводил в заблуждение)
watch(email, () => {
  emailStatus.value = 'idle'
})

const usernameStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
let usernameCheckTimer: ReturnType<typeof setTimeout> | null = null

const infoMsg = ref('') // информационное уведомление после успеха

// password policy подсчёт
const passwordLengthOk = computed(() => password.value.length >= 6)
const passwordsMatch = computed(() => password.value && password.value === confirmPassword.value)

const step = ref<number>(1) // 1..3
const isLoading = ref<boolean>(false)
const errorMsg = ref<string>('')

const direction = ref<'left' | 'right'>('left') // для анимации
const router = useRouter()

const canNextStep = computed(() => {
  if (step.value === 1) {
    return email.value.trim().length > 0 && /\S+@\S+\.\S+/.test(email.value)
  }
  if (step.value === 2) {
    return username.value.trim().length >= 3 && usernameStatus.value === 'available'
  }
  if (step.value === 3) {
    return passwordLengthOk.value && passwordsMatch.value
  }
  return false
})

async function nextStep() {
  errorMsg.value = ''
  if (!canNextStep.value) {
    // показываем пользовательскую ошибку для текущего шага
    if (step.value === 1) errorMsg.value = 'Введите корректный email'
    if (step.value === 2) errorMsg.value = 'Имя пользователя должно быть не короче 3 символов'
    if (step.value === 3) {
      if (password.value.length < 6) errorMsg.value = 'Пароль должен быть не короче 6 символов'
      else errorMsg.value = 'Пароли не совпадают'
    }
    return
  }

  // если мы сейчас на шаге 1 - проверяем email перед переходом
  if (step.value === 1) {
    const ok = await checkEmailAvailable()
    if (!ok) {
      errorMsg.value = 'Этот email уже зарегистрирован'
      return
    }
    // если ok - продолжаем (далее будут другие валидации)
  }

  direction.value = 'left'
  if (step.value < 3) step.value += 1
}


function prevStep() {
  errorMsg.value = ''
  direction.value = 'right'
  if (step.value > 1) step.value -= 1
}


async function onGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  })
}

// Финальный submit (создаёт пользователя)
async function signUpNewUser() {
  // финальная валидация
  if (!email.value || !username.value || !password.value || !confirmPassword.value) {
    errorMsg.value = 'Заполните все поля'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Пароли не совпадают'
    return
  }
  if (password.value.length < 6) {
    errorMsg.value = 'Пароль слишком короткий'
    return
  }

  errorMsg.value = ''
  isLoading.value = true

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      user_metadata: { username: username.value },
      options: {}
    } as any) // supabase типы могут отличаться; привел к any чтобы не ломать сборку

    if (authError) throw authError

    if (authData?.user) {
      infoMsg.value = 'Аккаунт успешно создан. Добро пожаловать в SwagMusic!'

      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      });

      if (error) {
        console.log(error)
        errorMsg.value = 'Ошибка авторизации. Попробуйте войти вручную';
      }

      await router.push('/');
    } else {
      errorMsg.value = 'Непредвиденная ошибка'
    }
  } catch (err: any) {
    console.error(err)
    errorMsg.value = err?.message || 'Ошибка при регистрации'
  } finally {
    isLoading.value = false
  }
}

async function checkEmailAvailable() {
  const val = email.value?.trim()
  if (!val || !/\S+@\S+\.\S+/.test(val)) {
    emailStatus.value = 'idle'
    return false
  }

  emailStatus.value = 'checking'
  try {
    // используем таблицу profiles (в твоей схеме там есть поле email)
    const { data, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('email', val)
        .limit(1)

    if (error) {
      console.warn('email check error', error)
      emailStatus.value = 'idle'
      return false
    }

    const taken = Array.isArray(data) && data.length > 0
    emailStatus.value = taken ? 'taken' : 'available'
    return !taken
  } catch (err) {
    console.error(err)
    emailStatus.value = 'idle'
    return false
  }
}

// Проверяет уникальность username (debounced)
async function checkUsernameUnique() {
  const val = username.value.trim()
  if (val.length < 3) {
    usernameStatus.value = 'idle'
    return
  }

  usernameStatus.value = 'checking'
  try {
    const { data, error, count } = await supabase
        .from('profiles')
        .select('id', { head: false, count: 'exact' })
        .eq('username', val)
        .limit(1)

    if (error) {
      console.warn('username check error', error)
      usernameStatus.value = 'idle'
      return
    }

    // если есть запись — занято
    usernameStatus.value = (data && data.length > 0) ? 'taken' : 'available'
  } catch (e) {
    console.error(e)
    usernameStatus.value = 'idle'
  }
}

// Debounced watch на username
watch(username, () => {
  if (usernameCheckTimer) clearTimeout(usernameCheckTimer)
  usernameCheckTimer = setTimeout(() => {
    checkUsernameUnique()
  }, 500) // задержка 500ms
})

onUnmounted(() => {
  if (usernameCheckTimer) clearTimeout(usernameCheckTimer)
})

</script>

<template>
  <div class="max-w-md mx-auto">
    <h1 class="text-2xl font-semibold text-old-neutral-800 dark:text-white mb-4 text-center">Создать аккаунт</h1>

    <!-- steps indicator -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex-1 h-1 bg-old-neutral-200 dark:bg-old-neutral-700 rounded-full mr-3 overflow-hidden">
        <div
            class="h-full bg-green-600 transition-all"
            :style="{ width: `${(step - 1) / 2 * 100}%` }"
        />
      </div>
      <div class="flex gap-2 text-sm text-old-neutral-500 dark:text-old-neutral-300">
        <span :class="step >= 1 ? 'font-semibold text-green-600' : ''">1</span>
        <span class="text-xs">/</span>
        <span :class="step >= 2 ? 'font-semibold text-green-600' : ''">2</span>
        <span class="text-xs">/</span>
        <span :class="step >= 3 ? 'font-semibold text-green-600' : ''">3</span>
      </div>
    </div>

    <div class="bg-old-neutral-50 dark:bg-old-neutral-900 p-6 rounded-lg shadow-sm">
      <button
          type="button"
          @click="onGoogleSignIn"
          class="w-full flex items-center justify-center cursor-pointer gap-3 py-2 px-4 border rounded-full shadow-sm mb-4 text-white border-old-neutral-500 hover:border-white transition"
          aria-label="Sign up with Google"
      >
        <!-- simple Google icon -->
        <svg class="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.4h147.6c-6.4 34.5-25.9 63.8-55.4 83.4v69.3h89.4c52.4-48.3 82.9-119.4 82.9-197.7z"/>
          <path fill="#34A853" d="M272 544.3c74.2 0 136.4-24.4 181.9-66.2l-89.4-69.3c-25 16.8-57.4 26.9-92.5 26.9-71 0-131.2-47.9-152.6-112.3H29.5v70.6C75 489.8 167.5 544.3 272 544.3z"/>
          <path fill="#FBBC05" d="M119.4 322.4c-11.3-33.6-11.3-69.7 0-103.3V148.5H29.5c-39.4 77.6-39.4 169.4 0 247l89.9-72.9z"/>
          <path fill="#EA4335" d="M272 107.7c39.8 0 75.6 13.7 103.8 40.6l77.7-77.7C408 24.8 347.8 0 272 0 167.5 0 75 54.5 29.5 148.5l89.9 70.6C140.8 155.6 201 107.7 272 107.7z"/>
        </svg>
        <span class="text-sm font-medium">Продолжить через Google</span>
      </button>

      <div class="my-4 text-center text-sm text-old-neutral-400 dark:text-old-neutral-300">или</div>

      <!-- animated steps -->
      <div class="relative min-h-[220px]">
        <transition :name="direction === 'left' ? 'slide-left' : 'slide-right'" mode="out-in">
          <!-- STEP 1: email -->
          <div v-if="step === 1" key="step-1" class="space-y-4">
            <label class="block text-sm font-medium text-old-neutral-700 dark:text-white">Email</label>
            <input
                v-model="email"
                type="email"
                placeholder="you@example.com"
                @keyup.enter="nextStep"
                class="w-full pr-28 px-3 py-2 dark:text-old-neutral-400 rounded-md border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p class="text-xs mt-2">
              <span v-if="emailStatus === 'checking'">Проверка email…</span>
              <span v-else-if="emailStatus === 'available'" class="text-green-600">Email свободен</span>
              <span v-else-if="emailStatus === 'taken'" class="text-red-600">Этот email уже зарегистрирован</span>
            </p>
            <p class="text-xs text-old-neutral-500">Мы будем использовать этот email для входа и уведомлений.</p>
          </div>

          <!-- STEP 2: username -->
          <div v-else-if="step === 2" key="step-2" class="space-y-4">
            <label class="block text-sm font-medium text-old-neutral-700 dark:text-white">Имя пользователя</label>

            <div class="relative">
              <input
                  v-model="username"
                  type="text"
                  placeholder="Например SwagUser"
                  @keyup.enter="nextStep"
                  class="w-full px-3 py-2 rounded-md border border-old-neutral-200 dark:border-old-neutral-700 dark:text-old-neutral-400 bg-white dark:bg-old-neutral-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <!-- статус -->
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <template v-if="usernameStatus === 'checking'">
                  <!-- spinner -->
                  <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/></svg>
                </template>

                <template v-else-if="usernameStatus === 'available'">
                  <span class="text-sm text-green-600">Свободно</span>
                </template>

                <template v-else-if="usernameStatus === 'taken'">
                  <span class="text-sm text-red-600">Занято</span>
                </template>
              </div>

            </div>

            <p class="text-xs text-old-neutral-500">Имя пользователя уникально и будет частью ссылки профиля.</p>
          </div>

          <!-- STEP 3: password -->
          <div v-else key="step-3" class="space-y-4">
            <label class="block text-sm font-medium text-old-neutral-700 dark:text-white">Пароль</label>
            <input
                v-model="password"
                type="password"
                placeholder="Введите пароль"
                @keyup.enter="canNextStep ? signUpNewUser() : nextStep()"
                class="w-full px-3 py-2 rounded-md dark:text-old-neutral-400 border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <label class="block text-sm font-medium text-old-neutral-700 dark:text-white">Подтвердите пароль</label>
            <input
                v-model="confirmPassword"
                type="password"
                placeholder="Повторите пароль"
                @keyup.enter="canNextStep ? signUpNewUser() : nextStep()"
                class="w-full px-3 py-2 rounded-md dark:text-old-neutral-400 border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <!-- Password policy hint -->
            <div class="mt-2 text-sm">
              <div class="flex items-center gap-2">
                <svg v-if="passwordLengthOk" class="w-4 h-4 text-green-600" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                <svg v-else class="w-4 h-4 text-slate-400" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                <span :class="passwordLengthOk ? 'text-green-600' : 'text-slate-500'">Минимум 6 символов</span>
              </div>

              <div class="flex items-center gap-2 mt-1">
                <svg v-if="passwordsMatch" class="w-4 h-4 text-green-600" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                <svg v-else class="w-4 h-4 text-slate-400" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                <span :class="passwordsMatch ? 'text-green-600' : 'text-slate-500'">Пароли совпадают</span>
              </div>
            </div>

          </div>
        </transition>
      </div>

      <div v-if="errorMsg" class="mt-4 text-sm text-red-500">
        {{ errorMsg }}
      </div>

      <!-- controls -->
      <div class="mt-6 flex items-center justify-between">
        <button
            type="button"
            @click="prevStep"
            :disabled="step === 1 || isLoading"
            class="text-old-neutral-300 font-medium disabled:text-old-neutral-500 not-disabled:cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm disabled:opacity-50"
        >
          Назад
        </button>

        <div class="flex items-center gap-3">
          <button
              v-if="step < 3"
              type="button"
              @click="nextStep"
              :disabled="!canNextStep || isLoading"
              class="px-4 py-2 rounded-full font-medium text-sm cursor-pointer bg-green-500 text-white hover:bg-green-700 disabled:opacity-50"
          >
            Далее
          </button>

          <button
              v-else
              type="button"
              @click="signUpNewUser"
              :disabled="isLoading"
              class="px-4 py-2 rounded-full font-medium text-sm cursor-pointer bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <span v-if="isLoading">Создаем...</span>
            <span v-else>Зарегистрироваться</span>
          </button>
        </div>
      </div>

      <p class="mt-4 text-center text-sm text-old-neutral-500 dark:text-old-neutral-400">
        Уже есть аккаунт?
        <NuxtLink to="/login" class="ml-1 font-medium text-green-500 hover:text-green-400">Войти</NuxtLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* slide left: new content comes from right to left */
.slide-left-enter-active,
.slide-right-enter-active {
  transition: transform 280ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease;
}

.slide-left-leave-active,
.slide-right-leave-active {
  transition: transform 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease;
}

/* forward (left) */
.slide-left-enter-from {
  transform: translateX(18%);
  opacity: 0;
}
.slide-left-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-left-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-left-leave-to {
  transform: translateX(-18%);
  opacity: 0;
}

/* backward (right) */
.slide-right-enter-from {
  transform: translateX(-18%);
  opacity: 0;
}
.slide-right-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-right-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-right-leave-to {
  transform: translateX(18%);
  opacity: 0;
}
</style>
