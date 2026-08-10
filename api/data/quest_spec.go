package data

import (
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type QuestSpec struct {
	QuestType        proto.QuestType        `db:"quest_type"`
	EpicType         *proto.EpicType        `db:"epic_type"`
	EpicIndex        *uint16                `db:"epic_index"`
	EpicLength       *uint16                `db:"epic_length"`
	StartProgress    uint16                 `db:"start_progress"`
	EndProgress      uint16                 `db:"end_progress"`
	Reward           proto.QuestReward      `db:"reward"`
	Periodicity      proto.QuestPeriodicity `db:"periodicity"`
	Position         QuestPosition          `db:"position"`
	Rerollable       bool                   `db:"rerollable"`
	RequiredHero     *proto.Hero            `db:"required_hero"`
	RequiredCards    proto.U64JSONBArray    `db:"required_cards"`
	RequiredMinLevel *uint16                `db:"required_min_level"`
	RequiredMaxLevel *uint16                `db:"required_max_level"`
}

func (s *QuestSpec) Store(sess db.Session) db.Store {
	return DB.QuestsSpecs(sess)
}

func (s *QuestSpec) Validate() error {
	if s.Periodicity == proto.QuestPeriodicity_UNKNOWN || s.Periodicity > proto.QuestPeriodicity_SEASONAL {
		return fmt.Errorf("invalid periodicity %d", s.Periodicity)
	}

	if s.Position == QuestPositionUnknown || s.Position > QuestPositionThree {
		return fmt.Errorf("invalid position %d", s.Position)
	}

	if s.EpicType != nil && *s.EpicType == proto.EpicType_UNKNOWN {
		return fmt.Errorf("invalid epic type %s", s.EpicType)
	}

	if s.EpicType != nil {
		if s.EpicIndex == nil {
			return fmt.Errorf("epic index is missing")
		}

		if *s.EpicIndex == 0 {
			return fmt.Errorf("epic index cannot be 0")
		}

		if s.EpicLength == nil {
			return fmt.Errorf("epic length is missing")
		}

		if *s.EpicLength == 0 {
			return fmt.Errorf("epic length cannot be 0")
		}

		if *s.EpicLength < *s.EpicIndex {
			return fmt.Errorf("epic length cannot be lower than epic index")
		}
	}

	if s.RequiredHero != nil && *s.RequiredHero == proto.Hero_UNKNOWN {
		return fmt.Errorf("invalid required hero %s", s.RequiredHero)
	}

	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &QuestSpec{}
)

type QuestPosition uint16

func (p QuestPosition) Uint16() uint16 {
	return uint16(p)
}

const (
	QuestPositionUnknown QuestPosition = 0
	QuestPositionOne     QuestPosition = 1
	QuestPositionTwo     QuestPosition = 2
	QuestPositionThree   QuestPosition = 3
)

type QuestsSpecsStore struct {
	db.Collection
}

func (s *QuestsSpecsStore) FindByQuestType(questTypes ...proto.QuestType) ([]*QuestSpec, error) {
	if len(questTypes) == 0 {
		return nil, nil
	}

	var specs []*QuestSpec

	err := s.Find(db.Cond{"quest_type": db.AnyOf(questTypes)}).All(&specs)
	if err != nil {
		return nil, fmt.Errorf("find: %w", err)
	}

	return specs, nil
}

func (s *QuestsSpecsStore) FindByQuestAssignments(assignments ...*QuestAssignment) ([]*QuestSpec, error) {
	if len(assignments) == 0 {
		return nil, nil
	}

	var questTypes []proto.QuestType

	for _, assignment := range assignments {
		questTypes = append(questTypes, assignment.QuestType)
	}

	specs, err := s.FindByQuestType(questTypes...)
	if err != nil {
		return nil, fmt.Errorf("find by quest type: %w", err)
	}

	return specs, nil
}
