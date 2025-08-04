export enum NUMS_METHOD {
  UNKNOWN_DL_HIDING_KEY = 'UNKNOWN_DL_HIDING_KEY',
  TAG = 'TAGGED_HASH_KEY',
}

export type NUMS = {
  input: string;
  R: string;
  PK: string;
  method?: NUMS_METHOD;
  tag?: string;
}
