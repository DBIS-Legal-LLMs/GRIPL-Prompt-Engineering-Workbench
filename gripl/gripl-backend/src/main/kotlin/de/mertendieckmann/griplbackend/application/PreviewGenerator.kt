package de.mertendieckmann.griplbackend.application

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.microsoft.playwright.Playwright

class PreviewGenerator {

    private val htmlTemplate: String = loadHtmlTemplate()

    private fun loadHtmlTemplate(): String {
        return javaClass.getResource("/PreviewGeneratorTemplate.html")
            ?.readText(Charsets.UTF_8)
            ?: error("PreviewGeneratorTemplate.html nicht gefunden")
    }

    fun convertXmlToSvg(
        bpmnXml: String,
        correctIds: List<String>,
        falsePositiveIds: List<String>,
        falseNegativeIds: List<String>,
        classifications: Map<String, List<String>>? = null,
        theme: String = "light"
    ): String {
        Playwright.create().use { pw ->
            val browser = pw.chromium().launch(
                com.microsoft.playwright.BrowserType.LaunchOptions()
                    .setHeadless(true)
                    .setArgs(
                        listOf(
                            "--no-sandbox",
                            "--disable-setuid-sandbox"
                        )
                    )
            )
            browser.newPage().use { page ->
                page.setContent(htmlTemplate)
                page.waitForFunction("() => typeof window.convertBpmn === 'function'")

                val objectMapper = jacksonObjectMapper()

                val correctIdsJson = objectMapper.writeValueAsString(correctIds)
                val falsePositiveIdsJson = objectMapper.writeValueAsString(falsePositiveIds)
                val falseNegativeIdsJson = objectMapper.writeValueAsString(falseNegativeIds)
                val classificationsJson = objectMapper.writeValueAsString(classifications)
                val themeJson = objectMapper.writeValueAsString(theme)

                val result = page.evaluate(
                    """xml => window.convertBpmn(xml, $correctIdsJson, $falsePositiveIdsJson, $falseNegativeIdsJson, $classificationsJson, $themeJson)""",
                    bpmnXml
                )

                val success = (result as Map<*, *>)["success"] as Boolean
                if (!success) {
                    val err = result["error"] ?: "Unbekannter Fehler"
                    throw IllegalArgumentException("Ungültiges BPMN XML: $err")
                }
                return (result["svg"] as String)
            }
        }
    }
}