/** JWT Token 的 payload，access / refresh 兩種皆使用相同結構，以 `type` 區分 */
export type JwtTokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: string;
  type: JwtTokenType;
  iat?: number;
  exp?: number;
}
