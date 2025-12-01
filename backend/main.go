package main

import (
  "encoding/json"
  "fmt"
  "log"
  "net/http"
  "os"
)

func main() {
  http.HandleFunc("/routes", routesHandler)
  port := "8080"
  if p := os.Getenv("PORT"); p != "" {
    port = p
  }
  log.Println("Starting server on :" + port)
  log.Fatal(http.ListenAndServe(":"+port, nil))
}

func routesHandler(w http.ResponseWriter, r *http.Request) {
  // read file from data/routes.geojson (relative to repo root)
  data, err := os.ReadFile("../data/routes.geojson")
  if err != nil {
    http.Error(w, "cannot read data file: "+err.Error(), 500)
    return
  }

  id := r.URL.Query().Get("id")
  if id == "" {
    w.Header().Set("Content-Type", "application/json")
    w.Write(data)
    return
  }

  // filter simple by id property (naive)
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
