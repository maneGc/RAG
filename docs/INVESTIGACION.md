# Técnicas para ampliar el conocimiento de una Inteligencia Artificial

- **Práctica:** Técnicas para ampliar el conocimiento de una IA y aplicación RAG
- **Alumno:** Emmanuel Gutierrez
- **Fecha:** Noviembre de 2026

---

## Introducción

Un modelo de lenguaje grande (LLM) "sabe" lo que aprendió durante su entrenamiento, y ese conocimiento queda guardado en sus **parámetros** (los pesos de la red neuronal). Esto tiene tres límites:

1. **Fecha de corte:** no conoce lo que pasó después de entrenarse.
2. **Información privada:** no conoce los documentos internos de una empresa o escuela.
3. **Alucinaciones:** cuando no sabe algo, puede inventar una respuesta que suena convincente.

Para superar estos límites hay dos caminos: **cambiar los parámetros del modelo** (entrenarlo) o **darle la información en el momento de responder**, sin tocar sus parámetros. Las seis técnicas siguientes se ubican en uno de esos dos caminos.

---

## 1. Proporcionar información e instrucciones directamente al modelo (Prompt Engineering / In-Context Learning)

**¿Qué es y cómo funciona?**
Consiste en escribir en el *prompt* todo lo que el modelo necesita: instrucciones (*system prompt*), el rol que debe asumir, ejemplos de entrada y salida (*few-shot*) y los datos de referencia (por ejemplo, pegar un documento completo). El modelo usa esa información dentro de su **ventana de contexto**, que es la cantidad máxima de texto que puede leer en una sola petición. Hoy hay modelos con ventanas de cientos de miles o hasta un millón de *tokens*.

**¿Cómo se incorpora el conocimiento?**
Como texto dentro de la petición. El modelo lo "lee" y razona sobre él en ese momento (*in-context learning*), pero lo olvida al terminar la petición.

**¿Se modifican los parámetros?** No.

**Ventajas**
- Es lo más rápido y barato de implementar: no necesita entrenamiento ni infraestructura.
- El cambio es inmediato: se edita el prompt y listo.
- Funciona con cualquier modelo, incluso con los que solo se usan por API.

**Desventajas**
- Está limitado por el tamaño de la ventana de contexto.
- Cada petición paga por todos los *tokens* del contexto. Mandar documentos enormes en cada pregunta es caro y lento; el *prompt caching* lo reduce, pero no lo elimina.
- Con contextos muy largos, el modelo puede pasar por alto datos que están "a la mitad" (efecto *lost in the middle*).
- No escala a miles de documentos.

**Herramientas:** cualquier API de LLM (Anthropic, OpenAI, Google Gemini), herramientas de prueba de prompts (Anthropic Console, OpenAI Playground), plantillas de LangChain (`PromptTemplate`) y *prompt caching* para ahorrar en contextos repetidos.

**Ejemplo práctico:** un chatbot de atención a clientes de una pizzería al que se le pega en el *system prompt* el menú completo, los horarios y las reglas ("si preguntan por envíos fuera de la ciudad, di que no hay cobertura"). Como el menú cabe en una página, no hace falta nada más.

---

## 2. Entrenar un modelo desde cero o continuar su entrenamiento (Pre-training / Continued Pre-training)

**¿Qué es y cómo funciona?**
- **Pre-entrenamiento desde cero:** se toma una red neuronal con pesos aleatorios y se entrena con billones de *tokens* de texto para que aprenda a predecir la siguiente palabra. Así se crean los modelos base como GPT, Claude o Llama.
- **Pre-entrenamiento continuo (*continued pre-training*):** se parte de un modelo ya entrenado y se le sigue entrenando con la misma tarea (predecir la siguiente palabra), pero con un corpus grande de un dominio nuevo (medicina, finanzas, código, otro idioma).

**¿Cómo se incorpora el conocimiento?**
El conocimiento queda "comprimido" en los pesos del modelo después de procesar millones de documentos del dominio.

**¿Se modifican los parámetros?** Sí, todos.

**Ventajas**
- Da el control total sobre los datos, el idioma, el vocabulario (*tokenizer*) y la arquitectura.
- El modelo domina el dominio "de forma nativa", sin necesidad de contexto extra.
- El pre-entrenamiento continuo permite adaptar un modelo a un idioma o una jerga muy especializada.

**Desventajas**
- Es carísimo: requiere miles de GPUs durante semanas o meses y millones de dólares.
- Necesita cantidades enormes de datos limpios.
- Hay riesgo de **olvido catastrófico**: al aprender lo nuevo, el modelo pierde habilidades que tenía.
- El conocimiento queda "congelado": para actualizarlo hay que volver a entrenar.

**Herramientas:** PyTorch, Megatron-LM y NeMo (NVIDIA), DeepSpeed (Microsoft), PyTorch FSDP, Hugging Face Transformers y Nanotron, y clústeres de GPU en la nube (AWS, Google Cloud, Azure).

**Ejemplo práctico:**
- *Desde cero:* **BloombergGPT** (2023), un modelo de 50 mil millones de parámetros que Bloomberg entrenó con una mezcla de datos financieros propios y datos generales.
- *Continuo:* **Code Llama** de Meta, que se obtuvo al continuar el entrenamiento de Llama 2 con un corpus grande de código.

---

## 3. Adaptar un modelo existente mediante entrenamiento adicional (Fine-Tuning)

**¿Qué es y cómo funciona?**
Se toma un modelo ya entrenado y se le entrena un poco más con un conjunto **pequeño y supervisado** de ejemplos (normalmente de cientos a decenas de miles de pares "entrada → salida esperada"). Hay varias formas:
- **Fine-tuning completo:** se actualizan todos los pesos.
- **PEFT** (*Parameter-Efficient Fine-Tuning*), como **LoRA** o **QLoRA**: se congelan los pesos originales y se entrenan matrices pequeñas que se suman al modelo. Así se entrena menos del 1 % de los parámetros, y se puede hacer en una sola GPU.
- **Alineación con preferencias** (RLHF, DPO): se entrena con ejemplos de respuestas "mejores" y "peores".

**¿Cómo se incorpora el conocimiento?**
Mediante ejemplos que enseñan al modelo un **comportamiento**: un formato, un estilo, un tono o una tarea específica (clasificar, extraer datos, responder como un agente de soporte). El fine-tuning es bueno para enseñar *cómo* responder, pero no es la mejor forma de enseñar *hechos* nuevos.

**¿Se modifican los parámetros?** Sí: todos (fine-tuning completo) o una pequeña parte adicional (LoRA).

**Ventajas**
- Logra un estilo y un formato muy consistentes sin escribir prompts largos.
- Un modelo pequeño ajustado puede igualar a uno grande en una tarea concreta, con menor costo y latencia.
- Reduce los *tokens* del prompt en cada petición.

**Desventajas**
- Necesita un dataset de buena calidad, que es caro de construir.
- Actualizar el conocimiento implica volver a entrenar.
- Puede alucinar sobre los datos con los que se entrenó, y no puede citar fuentes.
- Hay riesgo de *overfitting* y de olvido catastrófico.
- Se necesitan GPUs o un servicio de pago, además de experiencia en machine learning.

**Herramientas:** Hugging Face Transformers + PEFT + TRL (`SFTTrainer`, `DPOTrainer`), Unsloth, Axolotl, LLaMA-Factory, los servicios de fine-tuning de OpenAI, Google Vertex AI y Amazon Bedrock, y Azure AI Foundry.

**Ejemplo práctico:** un hospital ajusta con LoRA un modelo abierto (por ejemplo, Llama o Mistral) con 5,000 notas médicas anotadas, para que convierta el dictado de un doctor en un reporte con el formato oficial del hospital (secciones, abreviaturas y códigos de diagnóstico).

---

## 4. Recuperar información externa relevante para responder preguntas (RAG — Retrieval-Augmented Generation)

**¿Qué es y cómo funciona?**
RAG combina un **buscador** con un **generador**. Funciona en dos fases:

1. **Indexación (una sola vez):** los documentos se dividen en fragmentos (*chunks*), cada fragmento se convierte en un vector numérico (*embedding*) y los vectores se guardan en una **base de datos vectorial**.
2. **Consulta (en cada pregunta):** la pregunta también se convierte en vector y se buscan los fragmentos más parecidos (**búsqueda semántica**). Esos fragmentos se insertan en el prompt junto con la pregunta, y el LLM redacta la respuesta basándose en ellos, con citas.

**¿Cómo se incorpora el conocimiento?**
Se recupera y se inyecta en el contexto solo cuando hace falta. El conocimiento vive **fuera** del modelo, en la base vectorial.

**¿Se modifican los parámetros?** No.

**Ventajas**
- Se mantiene actualizado al instante: basta con reindexar un documento nuevo, sin reentrenar.
- Puede **citar las fuentes**, lo que permite verificar las respuestas.
- Reduce las alucinaciones, porque la respuesta se basa en texto real.
- Escala a millones de documentos.
- Permite control de acceso: se puede filtrar qué documentos ve cada usuario.
- Es mucho más barato que entrenar.

**Desventajas**
- La calidad depende de la recuperación: si el buscador no encuentra el fragmento correcto, la respuesta será mala.
- Hay que diseñar bien el *chunking*, el modelo de embeddings y el número de fragmentos (*top-k*).
- Agrega latencia (embedding + búsqueda) y más infraestructura.
- Le cuesta responder preguntas que requieren "ver todo" el corpus a la vez (por ejemplo, "resume todos los documentos").

**Herramientas:** LangChain, LlamaIndex y Haystack (orquestación); bases vectoriales como Chroma, FAISS, Pinecone, Weaviate, Qdrant, Milvus y pgvector; modelos de embeddings como Sentence-Transformers, los de OpenAI, Voyage AI o Cohere; y re-rankers (Cohere Rerank, cross-encoders).

**Ejemplo práctico:** **nuestra aplicación**. Un asistente que responde preguntas sobre los reglamentos de una escuela (becas, biblioteca, titulación) y muestra de qué documento y sección sacó cada dato. Ver [ARQUITECTURA.md](ARQUITECTURA.md).

---

## 5. Almacenar y recuperar información de conversaciones o interacciones anteriores (Memoria)

**¿Qué es y cómo funciona?**
Los LLM no tienen estado: cada petición es independiente. La "memoria" es un sistema externo que guarda información de interacciones pasadas y la vuelve a incluir en el prompt cuando es útil. Hay varios tipos:
- **Memoria de corto plazo (*buffer*):** se envía el historial reciente de la conversación en cada petición.
- **Memoria resumida:** cuando el historial crece, se resume (*summarization* o *compaction*) para que quepa en el contexto.
- **Memoria de largo plazo:** se extraen hechos importantes ("el usuario es vegetariano", "prefiere respuestas cortas") y se guardan en una base de datos, a menudo vectorial, para recuperarlos en conversaciones futuras. Es como un RAG sobre la propia historia del usuario.

**¿Cómo se incorpora el conocimiento?**
Se guarda después de cada interacción y se recupera e inyecta en el contexto en las siguientes.

**¿Se modifican los parámetros?** No.

**Ventajas**
- Permite personalizar: el asistente "recuerda" preferencias y datos del usuario.
- Da continuidad entre sesiones, porque no hay que repetir el contexto.
- Es fundamental para agentes que trabajan en tareas largas.

**Desventajas**
- Implica riesgos de privacidad: se guardan datos personales, y hay que permitir verlos y borrarlos.
- La memoria puede guardar datos incorrectos u obsoletos y "contaminar" respuestas futuras.
- Hay que decidir qué recordar, qué olvidar y cuándo resumir.
- El historial consume *tokens* y aumenta el costo.

**Herramientas:** memoria de LangChain y LangGraph (*checkpointers*, *stores*), LlamaIndex Memory, Mem0, Letta (antes MemGPT), Zep, la herramienta de memoria de la API de Claude y la función de memoria de ChatGPT, Claude y Gemini.

**Ejemplo práctico:** un tutor virtual de matemáticas que guarda que el estudiante "tiene dificultades con fracciones" y "ya vio el tema de ecuaciones lineales". En la siguiente sesión, recupera esos datos y empieza con ejercicios de fracciones sin repetir lo que ya se vio.

---

## 6. Transferir capacidades y conocimientos de un modelo grande a uno más pequeño (Destilación de conocimiento)

**¿Qué es y cómo funciona?**
Un modelo grande (**maestro**) enseña a uno pequeño (**estudiante**). Hay dos formas principales:
- **Destilación clásica (*soft labels*):** el estudiante se entrena para imitar las **probabilidades** que el maestro asigna a cada posible respuesta, no solo la respuesta correcta. Esas probabilidades contienen más información; por ejemplo, que "gato" se parece más a "tigre" que a "coche".
- **Destilación con datos sintéticos:** el maestro genera miles de respuestas o razonamientos de alta calidad, y con ellos se hace fine-tuning del estudiante.

**¿Cómo se incorpora el conocimiento?**
Se entrena al estudiante con las salidas del maestro, y el conocimiento queda en los pesos del estudiante.

**¿Se modifican los parámetros?** Sí, los del modelo estudiante. El maestro no cambia.

**Ventajas**
- Produce modelos más pequeños, rápidos y baratos de ejecutar.
- Permite correr modelos en celulares, computadoras personales o dispositivos IoT, y sin internet.
- El estudiante conserva gran parte de la calidad del maestro en la tarea destilada.

**Desventajas**
- El estudiante casi nunca supera al maestro y pierde capacidades generales.
- Hace falta tener acceso al maestro y cómputo para entrenar.
- Los términos de uso de muchos modelos comerciales **prohíben** usar sus salidas para entrenar modelos competidores.
- El estudiante hereda los errores y sesgos del maestro.

**Herramientas:** Hugging Face Transformers + TRL (por ejemplo, `GKDTrainer`), PyTorch (pérdida KL-divergence), NVIDIA NeMo, Intel Neural Compressor y los servicios de destilación de algunos proveedores de nube.

**Ejemplo práctico:**
- **DistilBERT** (Hugging Face, 2019): es 40 % más pequeño y 60 % más rápido que BERT, y conserva cerca del 97 % de su capacidad de comprensión del lenguaje.
- **DeepSeek-R1-Distill** (2025): se usaron razonamientos generados por DeepSeek-R1 para entrenar modelos pequeños (basados en Qwen y Llama) que razonan mucho mejor que sus versiones originales.

---

## Tabla comparativa

| Criterio | Prompt / Contexto | Pre-entrenamiento | Fine-Tuning | RAG | Memoria | Destilación |
|---|---|---|---|---|---|---|
| **¿Modifica parámetros?** | No | Sí (todos) | Sí (todos o LoRA) | No | No | Sí (del estudiante) |
| **¿Dónde vive el conocimiento?** | En el prompt | En los pesos | En los pesos | En una base vectorial externa | En una base de datos de interacciones | En los pesos del estudiante |
| **Costo de implementación** | Muy bajo | Altísimo | Medio | Bajo–medio | Bajo–medio | Medio–alto |
| **Datos necesarios** | Unos pocos | Billones de *tokens* | Cientos a miles de ejemplos etiquetados | Los documentos tal cual | Las conversaciones | Muchas salidas del maestro |
| **Actualizar conocimiento** | Inmediato (editar prompt) | Reentrenar (meses) | Reentrenar (horas o días) | Inmediato (reindexar) | Automático | Re-destilar |
| **Cita fuentes** | Parcialmente | No | No | **Sí** | Parcialmente | No |
| **Riesgo de alucinación** | Medio | Alto | Alto | **Bajo** | Medio | Alto |
| **Escala de conocimiento** | Limitada por el contexto | Muy grande | Media | Muy grande | Por usuario | La del maestro (en una tarea) |
| **Ideal para** | Reglas y datos pequeños | Dominio o idioma nuevo a gran escala | Estilo, formato, tarea específica | Datos grandes, privados o cambiantes | Personalización y continuidad | Eficiencia y despliegue local |

## ¿En qué escenario usaríamos cada técnica?

| Escenario | Técnica recomendada | Por qué |
|---|---|---|
| Un bot con 2 páginas de reglas y un tono definido | **Prompt / contexto** | La información cabe en el prompt y no justifica más infraestructura. |
| Un país quiere un LLM soberano en una lengua indígena poco representada en internet | **Pre-entrenamiento continuo** | Hay que enseñar un idioma o vocabulario nuevo a fondo, y eso solo se logra en los pesos. |
| Un banco necesita que el modelo siempre responda en un JSON con formato fijo y con el tono de la marca | **Fine-tuning (LoRA)** | Es un comportamiento consistente, no un conocimiento que cambie. |
| Asistente sobre manuales, contratos o reglamentos que cambian con frecuencia y requiere citar fuentes | **RAG** | Se actualiza al instante y se puede verificar. |
| Asistente personal o tutor que debe recordar al usuario entre sesiones | **Memoria** | Se necesita continuidad y personalización. |
| App móvil que debe clasificar mensajes sin internet y con baja latencia | **Destilación** | Hace falta un modelo pequeño que corra en el dispositivo. |

> **En la práctica se combinan.** Un sistema real suele usar *prompt engineering* (instrucciones) + **RAG** (conocimiento) + **memoria** (personalización), y a veces un modelo con **fine-tuning** o **destilado** para reducir costos. Nuestra aplicación combina las dos primeras: un *system prompt* con reglas estrictas y la recuperación con RAG.

---

## Conclusiones (Parte 4)

### ¿Cuándo conviene utilizar RAG en lugar de Fine-Tuning?

Conviene usar **RAG** cuando el problema es de **conocimiento**, es decir, cuando el modelo necesita *saber* datos que no conoce:
- La información **cambia con frecuencia** (precios, políticas, inventarios, noticias).
- Se necesita **citar la fuente** o auditar de dónde salió la respuesta.
- La información es **privada** y requiere control de acceso por usuario.
- Hay **muchos documentos** y no hay un dataset etiquetado de preguntas y respuestas.
- Se quiere **reducir alucinaciones** con datos verificables.

**Fine-tuning** conviene cuando el problema es de **comportamiento**: un formato, estilo o tono muy específico, una tarea repetitiva (clasificar, extraer) o reducir costos haciendo que un modelo pequeño haga bien una tarea concreta. Una regla práctica: *RAG para lo que el modelo debe saber; fine-tuning para cómo debe responder*. Ambos se pueden combinar.

### ¿Qué son los embeddings y cómo funciona una búsqueda semántica?

Un **embedding** es una representación de un texto como un **vector de números** (en nuestra app, 384 números). Lo genera un modelo de lenguaje entrenado para que textos con **significado parecido** queden **cerca** en ese espacio vectorial, aunque usen palabras diferentes. Por ejemplo, "¿Cuántas faltas puedo tener?" y "el máximo de faltas permitidas es el 20 %" quedan cerca, aunque no compartan las mismas palabras.

La **búsqueda semántica** funciona así:
1. Todos los fragmentos de los documentos se convierten en vectores y se guardan en la base vectorial.
2. La pregunta se convierte en vector con el **mismo modelo**.
3. Se calcula la **similitud coseno** entre el vector de la pregunta y cada vector guardado. Mide el ángulo entre los vectores: 1 significa el mismo significado, 0 que no hay relación.
4. Se devuelven los *k* fragmentos más similares.

A diferencia de la búsqueda por palabras clave, la búsqueda semántica entiende sinónimos y paráfrasis ("entregar tarde un libro" ↔ "retraso en la devolución").

### ¿Qué ventajas tiene RAG frente a entrenar nuevamente un modelo?

1. **Actualización inmediata:** para agregar o corregir información solo se reindexa el documento (segundos), en lugar de reentrenar (horas, días o meses).
2. **Costo mucho menor:** no requiere GPUs para entrenar ni datasets etiquetados.
3. **Trazabilidad:** cada respuesta muestra sus fuentes y se puede verificar.
4. **Menos alucinaciones:** el modelo responde con base en texto recuperado y puede decir "no tengo información".
5. **Control de acceso y privacidad:** los datos no quedan "grabados" en el modelo; se pueden borrar o filtrar por usuario.
6. **Independencia del modelo:** se puede cambiar de LLM (Claude, Llama, etc.) sin perder el conocimiento, porque este vive en la base vectorial.
7. **Sin olvido catastrófico:** el modelo base no se toca, así que conserva todas sus capacidades.

### ¿Qué técnica elegiríamos para una empresa cuya información cambia diariamente y por qué?

Elegiríamos **RAG**, complementado con *prompt engineering* para las reglas de comportamiento y, si hay interacción continua con usuarios, con **memoria**.

**Por qué:**
- Con fine-tuning o pre-entrenamiento habría que **reentrenar todos los días**, lo cual es caro y lento, y el modelo siempre estaría desactualizado entre entrenamientos.
- Con RAG, la información nueva solo se **reindexa**; se puede automatizar con un proceso nocturno o en cuanto se modifica un documento. Además, solo se reprocesan los documentos que cambiaron.
- Las respuestas incluyen **fuentes con fecha**, lo que permite saber de qué versión del documento salió cada dato.
- Si un dato es incorrecto, se corrige en el documento y la corrección es inmediata.

Si además la empresa necesita un formato de respuesta muy específico, se puede añadir un fine-tuning ligero (LoRA) para el **estilo**, mientras el **conocimiento** sigue viniendo de RAG.
