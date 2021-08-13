import { IsEmail, IsNotEmpty } from 'class-validator';

export class GamesSearchDto {
  @IsNotEmpty()
  query: string;

  fetchIgdb: boolean;
}
