package proto

import "testing"

func TestHash(t *testing.T) {
	h1 := Hash("Hi")
	h2 := Hash("hI")
	if h1.String() != h2.String() {
		t.Fatal("invalid")
	}
}
