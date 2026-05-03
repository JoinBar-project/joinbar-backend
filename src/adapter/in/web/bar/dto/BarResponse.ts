export class BarResponse {
  id!: string;
  name!: string;
  address!: string | null;
  phone!: string | null;
  website!: string | null;
  imageUrl!: string | null;
  latitude!: number | null;
  longitude!: number | null;
  googlePlaceId!: string | null;
  tags!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
