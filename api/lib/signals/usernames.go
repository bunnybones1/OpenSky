package signals

const (
	SIMILAR_USERNAMES  = "similar usernames registered close together"
	DIGITS_IN_USERNAME = "digits in username"
	WEIRD_USERNAME     = "weird username"
)

// Usernames with lavenstein distance <=2
type SimilarUsernames struct {
	Usernames []string `json:"usernames"`
}

// Number of digits in username
type DigitsInUsername struct {
	DigitCount int `json:"digitCount"`
}
