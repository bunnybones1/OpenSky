package apitest

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func CheckErrorFormat(t *testing.T, err error) bool {
	if err == nil {
		panic("oops.. err argument passed to checkErrorFormat(..) is nil")
	}

	return assert.False(t, strings.Contains(err.Error(), `from intermediary`), `should be a well-formatted error`)
}
