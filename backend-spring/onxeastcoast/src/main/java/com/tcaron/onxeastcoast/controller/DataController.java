package com.tcaron.onxeastcoast.controller;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
public class DataController {

    private final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("/routes")
    public JsonNode getRoutes(@RequestParam(required = false) String id)
            throws IOException {

        Path path = Paths.get("..","..", "data", "routes.geojson");
        JsonNode root = mapper.readTree(Files.readAllBytes(path));

        if (id == null) {
            return root;
        }

        ArrayNode features = (ArrayNode) root.get("features");
        ArrayNode filtered = mapper.createArrayNode();

        for (JsonNode feature : features) {
            JsonNode props = feature.get("properties");
            if (props != null && id.equals(props.get("id").asText())) {
                filtered.add(feature);
                break;
            }
        }

        ObjectNode out = mapper.createObjectNode();
        out.put("type", "FeatureCollection");
        out.set("features", filtered);

        return out;
    }

    @GetMapping("/metadata.json")
    public JsonNode getMetadata() throws IOException {
        Path path = Paths.get("..","..", "data", "metadata.json");
        return mapper.readTree(Files.readAllBytes(path));
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

}
