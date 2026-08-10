package rpc

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"github.com/goware/emailx"
	"github.com/pkg/errors"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) JoinEarlyAccessList(ctx context.Context, emailAddress string) (bool, string, error) {
	oplog := rctx.Logger(ctx)

	if s.Mailchimp == nil {
		oplog.Error().Msgf("mailchimp is not configured")
		return false, "unavailable", proto.Errorf(proto.ErrAborted, "early access is unavailable at this time")
	}

	err := emailx.Validate(emailAddress)
	if err != nil {
		return false, "invalid email address", proto.ErrorInvalidArgument("emailAddress", "is invalid")
	}

	status, _, err := s.Mailchimp.AddEarlyAccessContact(emailAddress)
	if status {
		return true, "", nil
	}

	return false, "failed to add email to waiting list", err
}

func (s *Server) RecordGameClientFeedback(ctx context.Context, req *proto.GameClientFeedback) (bool, error) {
	if config.Instance.S3.AccessKey == "" || config.Instance.S3.AccessSecretKey == "" || config.Instance.S3.RecordsBucket == "" {
		// client is disabled, and thats okay
		return false, errors.New("s3 is not configured.")
	}

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	now := time.Now().UTC()

	key := fmt.Sprintf("/client-feedback/%s/%s/%s_%s_%s",
		config.Instance.S3.Prefix,
		now.Format("2006-01"),
		req.Sentiment,
		account.Address.String(),
		now.Format("2006-01-02_15-04-05"),
	)

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
	})
	if err != nil {
		return false, err
	}
	sess.Config.WithCredentials(credentials.NewStaticCredentials(config.Instance.S3.AccessKey, config.Instance.S3.AccessSecretKey, ""))

	// Detect s3 region and provide random hint
	region, err := s3manager.GetBucketRegion(context.Background(), sess, config.Instance.S3.RecordsBucket, "us-west-2")
	if err != nil {
		return false, err
	}
	if region == "" {
		return false, errors.New("unknown region")
	}
	sess.Config.WithRegion(region)

	conn := s3.New(sess)

	clientFeedbackDump, err := json.Marshal(req.Dump)
	if err != nil {
		return false, err
	}
	bodyReader := bytes.NewReader(clientFeedbackDump)

	// Prepare object to upload
	op := &s3.PutObjectInput{
		Bucket:      aws.String(config.Instance.S3.RecordsBucket),
		Key:         aws.String(key + ".json"),
		ACL:         aws.String(s3.BucketCannedACLPrivate),
		ContentType: aws.String("application/json"),
		Body:        bodyReader,
	}

	// upload dump
	r, _ := conn.PutObjectRequest(op)
	if err := r.Send(); err != nil {
		return false, err
	}

	// screenshot
	if req.ScreenshotImageURI == "" {
		return true, nil
	}
	imgBin, err := base64.StdEncoding.DecodeString(req.ScreenshotImageURI)
	if err != nil {
		return false, err
	}
	bodyReader = bytes.NewReader(imgBin)

	// Prepare object to upload
	op2 := &s3.PutObjectInput{
		Bucket:      aws.String(config.Instance.S3.RecordsBucket),
		Key:         aws.String(key + ".jpeg"),
		ACL:         aws.String(s3.BucketCannedACLPrivate),
		ContentType: aws.String("image/jpeg"),
		Body:        bodyReader,
	}

	// upload screenshot
	r, _ = conn.PutObjectRequest(op2)
	if err := r.Send(); err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) HeroUnlockLevels(ctx context.Context) (map[string]uint16, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	levelsByHero, err := data.ListLevelsByHero(repo)
	if err != nil {
		logger.Err(err).Msg("list levels by hero")
		return nil, proto.ErrorInternal("list levels by hero")
	}

	return levelsByHero, nil
}

func (s *Server) DeckClassUnlockLevels(ctx context.Context) (map[string]uint16, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	deckClassUnlockLevels, err := data.DeckClassUnlockLevels(repo)
	if err != nil {
		logger.Err(err).Msg("get deck class unlock levels")
		return nil, proto.ErrorInternal("get deck class unlock levels")
	}

	return deckClassUnlockLevels, nil
}
