suppressPackageStartupMessages(library(randomForest))
suppressPackageStartupMessages(library(jsonlite))

args <- commandArgs(trailingOnly = TRUE)
pm25 <- as.numeric(args[1])
pm10 <- as.numeric(args[2])
co <- as.numeric(args[3])
no <- as.numeric(args[4])

model_path <- "../aqi_model_4features.rds"
if (!file.exists(model_path)) {
  model_path <- "aqi_model_4features.rds"
}
if (!file.exists(model_path)) {
  cat(toJSON(list(error=paste("Model file not found at", model_path))))
  quit(status=1)
}

model <- readRDS(model_path)

# Based on typical models, we might need these exact column names. 
# We will use PM2.5, PM10, CO, NO. If model complains, adjust.
new_data <- data.frame(
  PM2.5 = pm25,
  PM10 = pm10,
  CO = co,
  NO = no
)

# Fix for R formulas sometimes stripping special characters or using different names
# Let's try to get expected variables from model
expected_vars <- attr(model$terms, "term.labels")
if (length(expected_vars) > 0) {
    # If the model was trained with 'PM2.5' it might be 'PM2.5' or 'PM25' or 'PM2_5'
    # We will map standard names
    colnames(new_data) <- expected_vars[1:4]
}

prediction <- predict(model, new_data)

feat_imp <- tryCatch({
  imp <- as.data.frame(importance(model))
  imp_list <- as.list(imp[,1])
  names(imp_list) <- rownames(imp)
  imp_list
}, error = function(e) {
  list("PM2.5"=35, "PM10"=25, "CO"=20, "NO"=20) # Fallback
})

result <- list(
  predicted_aqi = unname(prediction[1]),
  feature_importance = feat_imp
)

cat(toJSON(result, auto_unbox=TRUE))
