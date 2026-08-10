export enum MatchMakerStatus {
  SEARCHING = 'SEARCHING', // Show "Searching" notification
  SEARCH_ERRORED = 'SEARCH_ERRORED', // Show "Could not join queue" notification
  MATCH_FOUND = 'MATCH_FOUND', // Show "Accept Decline" notification
  IN_PROGRESS_MATCH = 'IN_PROGRESS_MATCH', // Show "You have in progress match" notification
  TIMED_OUT = 'TIMED_OUT', // Show "Timed out, re-enter queue?" notification
  WAITING_OPPONENT = 'WAITING_OPPONENT', // Show "Waiting on opponent" notification
  OPPONENT_DECLINED = 'OPPONENT_DECLINED', // Show "Opponent declined" notification
  JOINING_QUEUE = 'JOINING_QUEUE' // Show "Joining Queue" notification
}
