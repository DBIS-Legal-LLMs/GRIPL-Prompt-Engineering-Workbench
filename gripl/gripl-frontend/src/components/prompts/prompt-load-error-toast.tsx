"use client";

import { useToast } from "@/components/ui/toast";
import { useEffect } from "react";

/**
 * Displays a toast notification indicating that loading the prompts has failed. 
 */
export default function PromptLoadErrorToast() {
    const { showError } = useToast();

    useEffect(() => {
        showError(
            "Failed to load prompts",
            "Make sure the backend is running and the API URL is correct."
        );
    }, [showError]);

    return null;
}