package com.flowforge.execution.executor;

import com.flowforge.execution.engine.ContextResolver;
import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.model.StepDef;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Iterates over a collection from the execution context and
 * records each item's result. For simplicity, each item is logged
 * and the loop result collects all item results.
 */
@Component
public class LoopStepExecutor implements StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(LoopStepExecutor.class);

    private static final String TYPE = "LOOP";
    private static final int MAX_ITERATIONS = 1000;

    private final ContextResolver contextResolver;

    public LoopStepExecutor(ContextResolver contextResolver) {
        this.contextResolver = contextResolver;
    }

    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    @SuppressWarnings("unchecked")
    public StepExecutionResult execute(StepDef step, ExecutionContext context) {
        Map<String, Object> config = step.getConfig();
        if (config == null) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("LOOP step '" + step.getStepId() + "' has no config")
                    .build();
        }

        String collectionExpression = (String) config.get("collection");
        if (collectionExpression == null) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("LOOP step '" + step.getStepId() + "' requires 'collection' in config")
                    .build();
        }

        // Resolve the collection from context
        Object collectionObj;
        if (collectionExpression.startsWith("${")) {
            String expression = collectionExpression.substring(2, collectionExpression.length() - 1);
            collectionObj = contextResolver.resolveObject(expression, context);
        } else {
            collectionObj = collectionExpression;
        }

        if (collectionObj == null) {
            log.warn("LOOP step '{}' collection resolved to null, treating as empty", step.getStepId());
            return StepExecutionResult.builder()
                    .success(true)
                    .output(Map.of("iterationsCompleted", 0, "results", new ArrayList<>()))
                    .build();
        }

        List<Object> items;
        if (collectionObj instanceof Collection) {
            items = new ArrayList<>((Collection<Object>) collectionObj);
        } else if (collectionObj instanceof Object[]) {
            items = List.of((Object[]) collectionObj);
        } else {
            items = List.of(collectionObj);
        }

        if (items.size() > MAX_ITERATIONS) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("LOOP step '" + step.getStepId() + "' collection exceeds maximum of " + MAX_ITERATIONS + " items")
                    .build();
        }

        String itemVariable = (String) config.getOrDefault("itemVariable", "item");
        String indexVariable = (String) config.getOrDefault("indexVariable", "index");

        log.info("LOOP step '{}' iterating over {} items", step.getStepId(), items.size());

        List<Map<String, Object>> results = new ArrayList<>();
        int index = 0;
        for (Object item : items) {
            Map<String, Object> itemResult = new HashMap<>();
            itemResult.put(indexVariable, index);
            itemResult.put(itemVariable, item);
            itemResult.put("status", "processed");
            results.add(itemResult);
            log.debug("LOOP step '{}' processed item[{}]: {}", step.getStepId(), index, item);
            index++;
        }

        Map<String, Object> output = new HashMap<>();
        output.put("iterationsCompleted", items.size());
        output.put("results", results);

        return StepExecutionResult.builder()
                .success(true)
                .output(output)
                .build();
    }
}
