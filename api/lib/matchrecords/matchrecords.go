package matchrecords

import (
	"errors"
	"fmt"
	"time"
)

type MatchRecords interface {
	UploadArchiveRecords(matchID uint64, index int64, jsonStringData string) error
	ArchiveURI(matchID uint64, index int64) string
	LiveURI(matchID uint64, index int64) string
	GetSignedRecordsURLs(matchID uint64, expiration time.Duration) ([]string, error)
}

type Mode uint16

const (
	ModeArchive Mode = iota
	ModeLive
)

var (
	ErrClientNotConfigured = errors.New("matchrecords: store is not configured")
	ErrStoreDisconnected   = errors.New("matchrecords: store connection is offline")
)

type RecordIndexObject struct {
	LastIndex int64 `json:"last_index"` // last index counter
	UpdatedAt int64 `json:"updated_at"` // unix timestamp
}

func Key(mode Mode, matchID uint64, index int64) string {
	filename := "index.json" // therefore, index -1 is the index file
	if index >= 0 {
		filename = fmt.Sprintf("%04d.json", index)
	}
	key := ""

	if mode == ModeArchive {
		key += fmt.Sprintf(`match/archive/%d/%s`, matchID, filename)
	} else if mode == ModeLive {
		key += fmt.Sprintf(`match/live/%d/%s`, matchID, filename)
	}
	return key
}
