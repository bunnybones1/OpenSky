package events

import (
	"encoding/gob"
	"time"

	"github.com/goware/pubsub"

	"github.com/horizon-games/OpenSky/api/proto"
)

type PubSub pubsub.PubSub[Event]

type Type uint8

const (
	TypeNone     Type = iota
	TypeFound         // Two players matched with each other
	TypeAccepted      // A player accepted the match
	TypeMade          // The match was succefully created/started on game server
	TypeDeclined      // A player declined the match
	TypeEvicted       // A player was removed from the queue
	TypeTimedOut      // Timed-out while waiting for player action
	TypeError
)

type Event interface {
	Type() Type
}

var eventTypeNames = map[Type]string{
	TypeFound:    "FOUND",
	TypeAccepted: "ACCEPTED",
	TypeMade:     "MADE",
	TypeDeclined: "DECLINED",
	TypeEvicted:  "EVICTED",
	TypeError:    "ERROR",
	TypeTimedOut: "TIMED_OUT",
}

func (t Type) String() string {
	return eventTypeNames[t]
}

func init() {
	gob.Register(EventAcceptedMessage{})
	gob.Register(EventDeclinedMessage{})
	gob.Register(EventEvictedMessage{})
	gob.Register(EventMadeMessage{})
	gob.Register(EventFoundMessage{})
	gob.Register(EventTimeOutMessage{})
	gob.Register(Error{})
}

type Error struct {
	Reason string
}

func (e Error) Error() string {
	return e.Reason
}

func (e Error) Type() Type {
	return TypeError
}

func NewError(m string) *Error {
	return &Error{Reason: m}
}

type EventAcceptedMessage struct {
	PlayerID proto.Hash
}

func (e EventAcceptedMessage) Type() Type {
	return TypeAccepted
}

type EventTimeOutMessage struct {
	Player1Accepted bool
	Player2Accepted bool
}

func (e EventTimeOutMessage) Type() Type {
	return TypeTimedOut
}

type EventDeclinedMessage struct {
	PlayerID proto.Hash
}

func (e EventDeclinedMessage) Type() Type {
	return TypeDeclined
}

type EventEvictedMessage struct {
	Error *Error
}

func (e EventEvictedMessage) Type() Type {
	return TypeEvicted
}

type EventFoundMessage struct {
	PlayerID   proto.Hash
	OpponentID proto.Hash
	TTL        time.Duration
	Mode       proto.GameMode
}

func (e EventFoundMessage) Type() Type {
	return TypeFound
}

type EventMadeMessage struct {
	ServerAddress string
	Mode          proto.GameMode
}

func (e EventMadeMessage) Type() Type {
	return TypeMade
}

var _ = []Event{
	EventAcceptedMessage{},
	EventDeclinedMessage{},
	EventMadeMessage{},
	EventEvictedMessage{},
	EventFoundMessage{},
	EventTimeOutMessage{},
	Error{},
}

var _ error = &Error{}
