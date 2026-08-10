package matchrecords

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"

	"github.com/horizon-games/OpenSky/api/config"
)

type S3MatchRecords struct {
	Config config.S3Config
	s3Conn *s3.S3
	mu     sync.Mutex
}

var (
	_ MatchRecords = &S3MatchRecords{}
)

func NewS3MatchRecords(cfg config.S3Config) (*S3MatchRecords, error) {
	m := &S3MatchRecords{Config: cfg}
	return m, nil
}

func (m *S3MatchRecords) IsConnected() (bool, error) {
	cfg := m.Config
	if cfg.AccessKey == "" || cfg.AccessSecretKey == "" || cfg.RecordsBucket == "" {
		// client is disabled, and thats okay
		return false, ErrClientNotConfigured
	}
	if m.s3Conn == nil {
		return false, ErrStoreDisconnected
	}
	return true, nil
}

func (m *S3MatchRecords) connectS3() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	cfg := m.Config
	if cfg.AccessKey == "" || cfg.AccessSecretKey == "" || cfg.RecordsBucket == "" {
		// client is disabled, and thats okay
		return ErrClientNotConfigured
	}

	// S3 session, config and options
	awsConfig := aws.Config{
		// create our own http client so s3 doesn't share the default client
		// with the rest of the service
		HTTPClient: &http.Client{
			Timeout: time.Second * 15,
		},

		// s3 client will auto retry automatically up to num of times
		MaxRetries: aws.Int(2),
	}

	sess, err := session.NewSessionWithOptions(session.Options{
		Config: awsConfig,
		// SharedConfigState:  session.SharedConfigDisable,
		// AssumeRoleDuration: 1 * time.Minute,
	})
	if err != nil {
		return err
	}
	sess.Config.WithCredentials(credentials.NewStaticCredentials(cfg.AccessKey, cfg.AccessSecretKey, ""))

	// Detect s3 region and provide random hint
	region, err := s3manager.GetBucketRegion(context.Background(), sess, cfg.RecordsBucket, "us-west-2")
	if err != nil {
		return err
	}
	if region == "" {
		return errors.New("unknown region")
	}
	sess.Config.WithRegion(region)

	m.s3Conn = s3.New(sess)
	return nil
}

func (m *S3MatchRecords) getS3Conn() (*s3.S3, error) {
	connected, _ := m.IsConnected()
	if connected {
		return m.s3Conn, nil
	}
	if err := m.connectS3(); err != nil {
		return nil, err
	}
	if m.s3Conn == nil {
		return nil, ErrStoreDisconnected
	}
	return m.s3Conn, nil
}

func (m *S3MatchRecords) UploadArchiveRecords(matchID uint64, index int64, jsonStringData string) error {
	if matchID == 0 {
		return errors.New("matchrecords: invalid match id")
	}
	if jsonStringData == "" {
		return errors.New("matchrecords: cannot save empty data")
	}
	err := m.uploadRecords(ModeArchive, matchID, index, jsonStringData)
	if err != nil {
		return err
	}
	_, err = m.setLatestRecordIndex(ModeArchive, matchID, index)
	if err != nil {
		return err
	}
	return nil
}

func (m *S3MatchRecords) UploadLiveRecords(matchID uint64, index int64, jsonStringData string) error {
	if matchID == 0 {
		return errors.New("matchrecords: invalid match id")
	}
	if jsonStringData == "" {
		return errors.New("matchrecords: cannot save empty data")
	}
	err := m.uploadRecords(ModeLive, matchID, index, jsonStringData)
	if err != nil {
		return err
	}
	_, err = m.setLatestRecordIndex(ModeLive, matchID, index)
	if err != nil {
		return err
	}
	return nil
}

func (m *S3MatchRecords) ArchiveURI(matchID uint64, index int64) string {
	return m.RecordsURI(ModeArchive, matchID, index)
}

func (m *S3MatchRecords) LiveURI(matchID uint64, index int64) string {
	return m.RecordsURI(ModeLive, matchID, index)
}

func (m *S3MatchRecords) RecordsURI(mode Mode, matchID uint64, index int64) string {
	return fmt.Sprintf(`https://%s%s`, m.Config.RecordsBucket, m.Key(mode, matchID, index))
}

func (m *S3MatchRecords) GetRecordIndex(matchID uint64) (*RecordIndexObject, error) {
	s3c, err := m.getS3Conn()
	if err != nil {
		return nil, err
	}

	key := m.Key(ModeArchive, matchID, -1)

	op := &s3.GetObjectInput{
		Bucket: aws.String(m.Config.RecordsBucket),
		Key:    aws.String(key),
	}

	req, out := s3c.GetObjectRequest(op)
	if err := req.Send(); err != nil {
		return nil, err
	}
	if req.HTTPResponse == nil {
		return nil, errors.New("matchrecords: s3 httpresponse nil to fetch index")
	}
	if req.HTTPResponse.StatusCode != 200 {
		return nil, errors.New("matchrecords: unable to download index file")
	}

	data, err := io.ReadAll(out.Body)
	if err != nil {
		return nil, err
	}
	defer out.Body.Close()

	recordIndex := &RecordIndexObject{}
	err = json.Unmarshal(data, recordIndex)
	if err != nil {
		return nil, err
	}

	return recordIndex, nil
}

func (m *S3MatchRecords) GetSignedRecordsURLs(matchID uint64, expiration time.Duration) ([]string, error) {
	keys, err := m.ListRecordKeys(matchID)
	if err != nil {
		return nil, err
	}

	indexURL := ""
	recordsURLs := []string{}

	for _, key := range keys {
		signedURL, err := m.GetSignedURL(key, expiration)
		if err != nil {
			return nil, err
		}
		if filepath.Base(key) == "index.json" {
			indexURL = signedURL
		} else {
			recordsURLs = append(recordsURLs, signedURL)
		}
	}

	// return signed URLs and ensure the index file is the first element
	return append([]string{indexURL}, recordsURLs...), nil
}

func (m *S3MatchRecords) ListRecordKeys(matchID uint64) ([]string, error) {
	s3c, err := m.getS3Conn()
	if err != nil {
		return nil, err
	}

	folderKey := filepath.Dir(m.Key(ModeArchive, matchID, -1)) + "/"

	// trim the leading /, as aws doesn't like it in the key prefix
	folderKey = strings.TrimPrefix(folderKey, "/")

	// List keys from S3
	keys := []string{}
	var next *string = nil

	for {
		req, out := s3c.ListObjectsV2Request(&s3.ListObjectsV2Input{
			Bucket:            aws.String(m.Config.RecordsBucket),
			Prefix:            aws.String(folderKey),
			MaxKeys:           aws.Int64(1000), // max is 1000
			ContinuationToken: next,
		})

		if err := req.Send(); err != nil {
			return nil, err
		}

		for _, obj := range out.Contents {
			keys = append(keys, *obj.Key)
		}
		if out.NextContinuationToken == nil || *out.NextContinuationToken == "" {
			break
		}
		next = out.NextContinuationToken
	}

	return keys, nil
}

func (m *S3MatchRecords) UpdateRecordsACL(matchID uint64, public bool) (bool, error) {
	s3c, err := m.getS3Conn()
	if err != nil {
		return false, err
	}

	keys, err := m.ListRecordKeys(matchID)
	if err != nil {
		return false, err
	}

	acl := s3.BucketCannedACLPrivate
	if public {
		acl = s3.BucketCannedACLPublicRead
	}

	for _, key := range keys {
		req, _ := s3c.PutObjectAclRequest(&s3.PutObjectAclInput{
			Bucket: aws.String(m.Config.RecordsBucket),
			Key:    aws.String(key),
			ACL:    aws.String(acl),
		})
		if err := req.Send(); err != nil {
			return false, err
		}
	}

	return true, nil
}

func (m *S3MatchRecords) GetSignedURL(key string, expiration time.Duration) (string, error) {
	s3c, err := m.getS3Conn()
	if err != nil {
		return "", err
	}

	req, _ := s3c.GetObjectRequest(&s3.GetObjectInput{
		Bucket: aws.String(m.Config.RecordsBucket),
		Key:    aws.String(key),
	})

	signedURL, err := req.Presign(expiration)
	if err != nil {
		return "", err
	}

	return signedURL, nil
}

func (m *S3MatchRecords) Key(mode Mode, matchID uint64, index int64) string {
	filename := "index.json" // therefore, index -1 is the index file
	if index >= 0 {
		filename = fmt.Sprintf("%04d.json", index)
	}
	key := ""
	if m.Config.Prefix != "" {
		key += fmt.Sprintf("/%s", m.Config.Prefix)
	}
	if mode == ModeArchive {
		key += fmt.Sprintf(`/match/archive/%d/%s`, matchID, filename)
	} else if mode == ModeLive {
		key += fmt.Sprintf(`/match/live/%d/%s`, matchID, filename)
	}
	return key
}

func (m *S3MatchRecords) uploadRecords(mode Mode, matchID uint64, index int64, jsonStringData string) error {
	s3c, err := m.getS3Conn()
	if err != nil {
		return err
	}

	// TODO: after X minutes after match end, prevent any further uploads

	key := m.Key(ModeArchive, matchID, index)
	bodyReader := bytes.NewReader([]byte(jsonStringData))

	acl := ""
	// if mode == ModeArchive {
	acl = s3.BucketCannedACLPrivate
	// } else {
	// 	acl = s3.BucketCannedACLPublicRead
	// }

	// Prepare object to upload
	op := &s3.PutObjectInput{
		Bucket:      aws.String(m.Config.RecordsBucket),
		Key:         aws.String(key),
		ACL:         aws.String(acl),
		ContentType: aws.String("application/json"),
		Body:        bodyReader,
		// Expires:     s.expires, // cache-control stuff..
		// CacheControl: aws.String(".."),
	}

	req, _ := s3c.PutObjectRequest(op)
	if err := req.Send(); err != nil {
		return err
	}
	return nil
}

func (m *S3MatchRecords) setLatestRecordIndex(mode Mode, matchID uint64, index int64) (bool, error) {
	s3c, err := m.getS3Conn()
	if err != nil {
		return false, err
	}
	recordIndex := RecordIndexObject{
		LastIndex: index,
		UpdatedAt: time.Now().Unix(),
	}
	jsonStringData, err := json.Marshal(recordIndex)
	if err != nil {
		return false, err
	}

	// TODO: after X minutes after match end, prevent any further uploads

	key := m.Key(ModeArchive, matchID, -1)
	bodyReader := bytes.NewReader([]byte(jsonStringData))
	acl := s3.BucketCannedACLPublicRead // index can be public, its okay

	op := &s3.PutObjectInput{
		Bucket:      aws.String(m.Config.RecordsBucket),
		Key:         aws.String(key),
		ACL:         aws.String(acl),
		ContentType: aws.String("application/json"),
		Body:        bodyReader,
		// Expires:     s.expires, // cache-control stuff..
		// CacheControl: aws.String(".."),
	}

	req, _ := s3c.PutObjectRequest(op)
	if err := req.Send(); err != nil {
		return false, err
	}
	return true, nil
}
