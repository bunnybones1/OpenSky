package config

import "os"

var (
	VERSION         = "dev"
	GITBRANCH       = "branch"
	GITCOMMIT       = "dev"
	GITCOMMITDATE   = "now"
	GITCOMMITAUTHOR = "last author"
)

func ReleaseVersion() string {
	if version := os.Getenv("RELEASE_VERSION"); version != "" {
		return version
	}

	return GITCOMMIT
}
