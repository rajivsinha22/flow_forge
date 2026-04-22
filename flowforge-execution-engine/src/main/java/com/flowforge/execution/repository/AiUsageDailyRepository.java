package com.flowforge.execution.repository;

import com.flowforge.execution.model.AiUsageDaily;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface AiUsageDailyRepository extends MongoRepository<AiUsageDaily, String> {

    Optional<AiUsageDaily> findByClientIdAndDate(String clientId, LocalDate date);
}
