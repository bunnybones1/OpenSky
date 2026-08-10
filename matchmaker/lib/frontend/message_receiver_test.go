package frontend_test

import (
	"fmt"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

func TestMessageReceiver(t *testing.T) {
	expectedContent := []byte(`content`)

	expectedMessageType := messages.MessageType("some type")

	someError := fmt.Errorf("some error")

	receiver := frontend.NewMessageReceiver()

	t.Run("returns content and type", func(t *testing.T) {
		client := &clientReadCloser{
			readJSONFn: func(v any) ([]byte, error) {
				envelope, ok := v.(*messages.Envelope)
				require.True(t, ok)

				envelope.Type = expectedMessageType

				return expectedContent, nil
			},
		}

		content, messageType, err := receiver.Receive(client)
		require.NoError(t, err)
		assert.Equal(t, expectedMessageType, messageType)
		assert.Equal(t, expectedContent, content)
	})

	t.Run("returns empty results and closes client when timeout error happens", func(t *testing.T) {
		client := &clientReadCloser{
			readJSONFn: func(v any) ([]byte, error) {
				return nil, &timeoutError{}
			},
			closeFn: func() error {
				return nil
			},
		}

		content, messageType, err := receiver.Receive(client)
		require.NoError(t, err)
		assert.Equal(t, messages.EmptyMessageType, messageType)
		assert.Nil(t, content)

		assert.Equal(t, 1, client.closeFnCounter)
	})

	t.Run("returns empty results and closes client when unexpected websocket close error happens", func(t *testing.T) {
		client := &clientReadCloser{
			readJSONFn: func(v any) ([]byte, error) {
				return nil, &websocket.CloseError{Code: websocket.CloseMessageTooBig}
			},
			closeFn: func() error {
				return nil
			},
		}

		content, messageType, err := receiver.Receive(client)
		require.NoError(t, err)
		assert.Equal(t, messages.EmptyMessageType, messageType)
		assert.Nil(t, content)

		assert.Equal(t, 1, client.closeFnCounter)
	})

	t.Run("returns empty results and closes client when unexpected websocket close error happens", func(t *testing.T) {
		client := &clientReadCloser{
			readJSONFn: func(v any) ([]byte, error) {
				return nil, someError
			},
		}

		content, messageType, err := receiver.Receive(client)
		require.ErrorIs(t, err, someError)
		assert.Equal(t, messages.EmptyMessageType, messageType)
		assert.Nil(t, content)
	})
}

type clientReadCloser struct {
	readJSONFn     func(any) ([]byte, error)
	closeFn        func() error
	closeFnCounter int
}

func (c *clientReadCloser) ReadJSON(v any) ([]byte, error) {
	return c.readJSONFn(v)
}

func (c *clientReadCloser) Close() error {
	c.closeFnCounter++
	return c.closeFn()
}

type timeoutError struct {
}

func (e *timeoutError) Error() string {
	return ""
}

func (e *timeoutError) Timeout() bool {
	return true
}
