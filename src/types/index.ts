export type CommandType = 
  | 'PLAY' | 'PAUSE' | 'TOGGLE_PLAY' 
  | 'SEEK' | 'SEEK_RELATIVE' 
  | 'SET_SPEED' | 'CHANGE_SPEED'
  | 'SET_VOLUME' | 'CHANGE_VOLUME'
  | 'MARK_LOOP_A' | 'MARK_LOOP_B' | 'CLEAR_LOOP' | 'TOGGLE_LOOP' | 'GO_TO_LOOP_A';

export interface RemoteCommand {
  type: CommandType;
  payload?: any;
}
