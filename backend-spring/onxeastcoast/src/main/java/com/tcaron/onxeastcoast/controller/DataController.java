package com.tcaron.onxeastcoast.controller;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class DataController {

    private final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("/routes")
    public JsonNode getRoutes(@RequestParam(required = false) String id) throws IOException {

        ClassPathResource resource = new ClassPathResource("data/routes.geojson");

        if (!resource.exists()) {
            throw new IllegalStateException("routes.geojson not found on classpath");
        }

        try (var is = resource.getInputStream()) {
            JsonNode root = mapper.readTree(is);

            if (id == null) {
                return root;
            }

            ArrayNode features = (ArrayNode) root.path("features");
            ArrayNode filtered = mapper.createArrayNode();

            for (JsonNode feature : features) {
                JsonNode props = feature.path("properties");
                if (id.equals(props.path("id").asText())) {
                    filtered.add(feature);
                    break;
                }
            }

            ObjectNode out = mapper.createObjectNode();
            out.put("type", "FeatureCollection");
            out.set("features", filtered);
            return out;
        }
    }

    @GetMapping("/metadata.json")
    public JsonNode getMetadata() throws IOException {

        ClassPathResource resource = new ClassPathResource("data/metadata.json");

        if (!resource.exists()) {
            throw new IllegalStateException("metadata.json not found on classpath");
        }

        try (var is = resource.getInputStream()) {
            return mapper.readTree(is);
        }
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
