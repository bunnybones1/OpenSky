package middleware

import (
	"context"
	"net/http"

	"github.com/horizon-games/OpenSky/api/data"
)

func DBContext(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// We're going to add a bulky object to the context, as far as I
		// understand, this bulky object is referenced and never copied in whole:
		// https://cs.opensource.google/go/go/+/refs/tags/go1.17.8:src/context/context.go;l=523
		//
		// As long as the bulky object is referenced, we shouldn't be adding a lot
		// of load to the context that is passed down the request chain, because
		// we'll be always passing a reference instead of the actual object.
		ctx := r.Context()

		// This database is tied to the context, if the context gets canceled, any
		// operation running under this database context is going to be canceled
		// too. Canceling operations on a database context won't affect operations
		// running on any other context.
		repo := &data.Database{
			Session: data.DB.Session.WithContext(ctx),
		}

		ctx = context.WithValue(ctx, DatabaseCtxKey, repo)
		r = r.WithContext(ctx)
		h.ServeHTTP(w, r)
	})
}
