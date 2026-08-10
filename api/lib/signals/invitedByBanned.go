package signals

const (
	INVITED_BY_BANNED              = "invited-by-banned"
	INVITED_BY_BANNED_ONCE_REMOVED = "invited-by-banned-once-removed"
)

// Invited by a banned account
type InvitedByBanned struct {
	InvitedByAddress []string `json:"accountAddress"`
}
