package matchrecords

import (
	"time"

	"github.com/horizon-games/OpenSky/api/config"
)

type CombinedMatchRecords struct {
	gcp *GCPMatchRecords
	s3  *S3MatchRecords
}

func NewCombinedMatchRecords(gcp config.GCPStorageConfig, s3 config.S3Config) (*CombinedMatchRecords, error) {
	gcpRecords, err := NewGCPMatchRecords(gcp)
	if err != nil {
		return nil, err
	}

	s3Records, err := NewS3MatchRecords(s3)
	if err != nil {
		return nil, err
	}

	return &CombinedMatchRecords{gcp: gcpRecords, s3: s3Records}, nil
}

func (m *CombinedMatchRecords) UploadArchiveRecords(matchID uint64, index int64, jsonStringData string) error {
	err := m.gcp.UploadArchiveRecords(matchID, index, jsonStringData)
	if err != nil {
		return err
	}

	err = m.s3.UploadArchiveRecords(matchID, index, jsonStringData)
	if err != nil {
		return err
	}

	return nil
}

func (m *CombinedMatchRecords) ArchiveURI(matchID uint64, index int64) string {
	return m.recordsURI(ModeArchive, matchID, index)
}

func (m *CombinedMatchRecords) LiveURI(matchID uint64, index int64) string {
	return m.recordsURI(ModeLive, matchID, index)
}

func (m *CombinedMatchRecords) GetSignedRecordsURLs(matchID uint64, expiration time.Duration) ([]string, error) {
	return m.s3.GetSignedRecordsURLs(matchID, expiration)
}

func (m *CombinedMatchRecords) recordsURI(mode Mode, matchID uint64, index int64) string {
	return m.s3.RecordsURI(mode, matchID, index)
}
