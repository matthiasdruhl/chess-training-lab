export interface ChessComPlayerRef {
  username: string;
  result: string;
  rating?: number;
}

export interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  time_class: string;
  end_time: number;
  rated: boolean;
  white: ChessComPlayerRef;
  black: ChessComPlayerRef;
}

export interface ChessComArchivesResponse {
  archives: string[];
}

export interface ChessComGamesResponse {
  games: ChessComGame[];
}

export interface FilteredGame {
  game: ChessComGame;
  userColor: 'white' | 'black';
  result: string;
  filterMatched: {
    repertoireSide: string;
    firstMovesSan: string[];
  };
}
