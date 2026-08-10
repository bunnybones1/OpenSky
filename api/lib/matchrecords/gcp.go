package matchrecords

import (
	"context"
	"path/filepath"
	"sync"
	"time"

	"github.com/Shopify/go-storage"
	"github.com/horizon-games/OpenSky/api/config"
)

type GCPMatchRecords struct {
	Config config.GCPStorageConfig
	fs     storage.FS
	mu     sync.Mutex
}

func NewGCPMatchRecords(cfg config.GCPStorageConfig) (*GCPMatchRecords, error) {
	var fs storage.FS
	if cfg.RecordsBucket != "" {
		fs = storage.NewCloudStorageFS(cfg.RecordsBucket, nil)
		if cfg.Prefix != "" {
			fs = storage.NewPrefixWrapper(fs, cfg.Prefix+"/")
		}
	}

	m := &GCPMatchRecords{
		Config: cfg,
		fs:     fs,
	}
	return m, nil
}

func (m *GCPMatchRecords) UploadArchiveRecords(matchID uint64, index int64, jsonStringData string) error {
	if m.fs == nil {
		return nil
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	w, err := m.fs.Create(context.Background(), Key(ModeArchive, matchID, index), &storage.WriterOptions{})
	if err != nil {
		return err
	}
	defer w.Close()

	_, err = w.Write([]byte(jsonStringData))

	return err
}

func (m *GCPMatchRecords) ArchiveURI(matchID uint64, index int64) string {
	return m.recordsURI(ModeArchive, matchID, index)
}

func (m *GCPMatchRecords) LiveURI(matchID uint64, index int64) string {
	return m.recordsURI(ModeLive, matchID, index)
}

func (m *GCPMatchRecords) GetSignedRecordsURLs(matchID uint64, expiration time.Duration) ([]string, error) {
	if m.fs == nil {
		return nil, nil
	}

	folderKey := filepath.Dir(Key(ModeArchive, matchID, -1)) + "/"
	var urls []string

	indexURL := ""

	err := m.fs.Walk(context.Background(), folderKey, func(filePath string) error {
		signedURL, err := m.getSignedURL(filePath, expiration)
		if err != nil {
			return err
		}
		if filepath.Base(filePath) == "index.json" {
			indexURL = signedURL
		} else {
			urls = append(urls, signedURL)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return append([]string{indexURL}, urls...), nil
}

func (m *GCPMatchRecords) recordsURI(mode Mode, matchID uint64, index int64) string {
	if m.fs == nil {
		return ""
	}
	url, _ := m.fs.URL(context.Background(), Key(mode, matchID, index), nil)
	return url
}

func (m *GCPMatchRecords) getSignedURL(key string, expiration time.Duration) (string, error) {
	return m.fs.URL(context.Background(), "", &storage.SignedURLOptions{
		Expiry: expiration,
		Method: "GET",
	})
}

/*
func listWALFiles(fs storage.FS) ([]walFile, error) {
	wlk, ok := fs.(storage.Walker)
	if !ok {
		return nil, fmt.Errorf("ethlogwal: provided file system does not implement Walker interface")
	}

	var walFiles []walFile
	err := wlk.Walk(context.Background(), "", func(filePath string) error {
		_, fileName := path.Split(filePath)
		firstBlockNum, lastBlockNum := parseWALFileBlockRange(fileName)
		walFiles = append(walFiles, walFile{
			Name:          fileName,
			FirstBlockNum: firstBlockNum,
			LastBlockNum:  lastBlockNum,
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.Slice(walFiles, func(i, j int) bool {
		return walFiles[i].FirstBlockNum < walFiles[j].FirstBlockNum
	})

	return walFiles, nil
}

*/
