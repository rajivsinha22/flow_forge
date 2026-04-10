package com.flowforge.billing.config;

import com.stripe.Stripe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StripeConfig {

    private static final Logger log = LoggerFactory.getLogger(StripeConfig.class);

    @Value("${stripe.api-key}")
    private String apiKey;

    @Bean
    public String stripeApiKeyInitializer() {
        Stripe.apiKey = apiKey;
        log.info("Stripe API key initialized (key ending in ...{})",
                apiKey.length() > 4 ? apiKey.substring(apiKey.length() - 4) : "****");
        return apiKey;
    }
}
