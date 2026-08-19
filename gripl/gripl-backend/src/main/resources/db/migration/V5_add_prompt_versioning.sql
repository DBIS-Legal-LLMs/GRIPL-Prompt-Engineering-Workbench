/*
 * This migration adds support for prompt versioning.
 * It creates two new tables: prompt and prompt_version.
 * The prompt table stores the basic information about prompts, while the prompt_version table stores specific versions of prompts.
 * Each prompt can have multiple versions. Each version has its own template, variables, classification scope and commit message.
 * The is_default column in the prompt_version table indicates whether a particular version is the default version used for regular GRIPL analyses.
 */
CREATE TABLE prompt (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/* 
 * Defines whether a prompt instructs the LLM to classify only activities or all BPMN elements.
 */
CREATE TYPE classification_scope AS ENUM (
    'ACTIVITIES_ONLY',
    'ALL_BPMN_ELEMENTS'
);

CREATE TABLE prompt_version (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    template TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    classification_scope classification_scope NOT NULL,
    commit_message TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_prompt_version_prompt
        FOREIGN KEY (prompt_id)
        REFERENCES prompt(id)
        ON DELETE CASCADE,

    /* Ensures that version numbers are unique for a given prompt. */
    CONSTRAINT uq_prompt_version_number
        UNIQUE (prompt_id, version_number),

    CONSTRAINT chk_prompt_version_version_number
        CHECK (version_number > 0)
);

/* 
 * Ensures that only one prompt version can be set as the default version at any given time.
 */
CREATE UNIQUE INDEX uq_prompt_version_single_default
ON prompt_version (is_default)
WHERE is_default = TRUE;