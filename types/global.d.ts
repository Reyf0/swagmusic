import "@supabase/postgrest-js";

declare module '@supabase/postgrest-js' {
  interface PostgrestFilterBuilder<T> extends PromiseLike<{ data: T; error: any }> {
    /** @internal */
    __promiseBrand?: never;
  }
}

declare module '*.svg' {
    const src: string;
    export default src;
}