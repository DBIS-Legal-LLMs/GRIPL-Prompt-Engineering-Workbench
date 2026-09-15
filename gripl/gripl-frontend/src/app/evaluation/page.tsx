"use client";

import React, { useEffect, useState } from "react";
import { Prompt } from "@/models/dto/Prompt";
import dynamic from "next/dynamic";
import {Dataset} from "@/models/dto/Dataset";
import {ColorProvider} from "@/components/evaluation/charts/common/color-context";
import { Spinner } from "@/components/ui/spinner";
import getDatasets from "@/actions/get-datasets";
import getPrompts from "@/actions/get-prompts";

const EvaluationPage = dynamic(() => import("@/components/evaluation/evaluation-page"), {
    ssr: false,
    loading: () => <div className="flex justify-center items-center h-screen"><Spinner size="large" /></div>
});

export default function Evaluation() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    function handlePromptCreated(createdPrompt: Prompt) {
        setPrompts((currentPrompts) => [...currentPrompts, createdPrompt]);
    }

    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                const data = await getDatasets();
                setDatasets(data);
            } catch (error) {
                console.error('Failed to fetch datasets:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDatasets();

        const fetchPrompts = async () => {
            setIsLoading(true);
            try {
                const prompts = await getPrompts();
                setPrompts(prompts ?? []);
            } catch (error) {
                console.error('Failed to fetch prompts:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPrompts();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner size="large" /></div>;
    }

    return <ColorProvider>
        <EvaluationPage datasets={datasets} prompts={prompts} onPromptCreated={handlePromptCreated}/>
    </ColorProvider>
}