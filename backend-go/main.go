package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

// enableCORS sets CORS headers
func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
}

func main() {
	// Serve frontend static files
	frontendDir := "../frontend"
	fs := http.FileServer(http.Dir(frontendDir))
	http.Handle("/", fs)

	// API endpoints
	http.HandleFunc("/routes", routesHandler)
	http.HandleFunc("/metadata.json", metadataHandler)

	port := "8080"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	log.Println("Starting server on :" + port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// routesHandler serves routes.geojson, optionally filtering by ?id=
func routesHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	dataFile := filepath.Join("..", "data", "routes.geojson")
	data, err := os.ReadFile(dataFile)
	if err != nil {
		http.Error(w, "cannot read routes file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
		return
	}

	// Filter by id
	var fc map[string]interface{}
	if err := json.Unmarshal(data, &fc); err != nil {
		http.Error(w, "json unmarshal error: "+err.Error(), 500)
		return
	}

	features, ok := fc["features"].([]interface{})
	if !ok {
		http.Error(w, "unexpected geojson structure", 500)
		return
	}

	out := map[string]interface{}{"type": "FeatureCollection", "features": []interface{}{}}
	for _, f := range features {
		feat := f.(map[string]interface{})
		props := feat["properties"].(map[string]interface{})
		if fmt.Sprintf("%v", props["id"]) == id {
			out["features"] = append(out["features"].([]interface{}), feat)
			break
		}
	}

	b, _ := json.MarshalIndent(out, "", "  ")
	w.Header().Set("Content-Type", "application/json")
	w.Write(b)
}

// metadataHandler serves metadata.json
func metadataHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	dataFile := filepath.Join("..", "data", "metadata.json")
	data, err := os.ReadFile(dataFile)
	if err != nil {
		http.Error(w, "cannot read metadata file: "+err.Error(), 500)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}
