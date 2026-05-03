export class UserProfileResponse {
  id!: string;
  email!: string | null;
  username!: string;
  nickname!: string | null;
  role!: string;
  birthday!: Date | null;
  avatarUrl!: string | null;
  createdAt!: Date;
}
