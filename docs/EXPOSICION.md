# Guion de la exposición (≈ 15 minutos)

## Antes de empezar (checklist)

- [ ] `npm run ingest` ya ejecutado, y `npm start` corriendo con http://localhost:3000 abierto.
- [ ] `.env` con el LLM configurado. Hay que probar una pregunta **antes** de exponer (el primer arranque descarga el modelo de embeddings).
- [ ] Si usas Ollama: la app de Ollama abierta y `ollama list` muestra el modelo.
- [ ] Tener abierto `docs/ARQUITECTURA.md` (diagrama) y un documento de `documentos/` para mostrar que el dato existe.
- [ ] Plan B sin internet: con Ollama todo funciona offline; con `LLM_PROVIDER=none` al menos se puede demostrar la recuperación.

## Estructura de diapositivas

| # | Diapositiva | Contenido clave | Tiempo |
|---|---|---|---|
| 1 | Título | Nombre de la práctica y del equipo | 0:15 |
| 2 | El problema | Un LLM no conoce datos privados ni recientes, y puede alucinar | 1:00 |
| 3 | Dos caminos | Cambiar los parámetros (entrenar) **vs.** dar la información en el contexto | 0:45 |
| 4 | Las 6 técnicas | Una línea por técnica + si modifica parámetros (tabla resumida) | 2:30 |
| 5 | Tabla comparativa + escenarios | Cuándo usar cada una | 1:30 |
| 6 | ¿Qué es RAG? | Indexación + consulta | 1:00 |
| 7 | Arquitectura de nuestra app | Diagrama de `ARQUITECTURA.md` | 1:00 |
| 8 | Chunking | Secciones → corte recursivo → overlap; 6 docs → 45 fragmentos; cómo elegimos el tamaño (barrido) | 1:00 |
| 9 | Embeddings y búsqueda semántica | Vector de 384 números, similitud coseno, top-k, umbral | 1:30 |
| 10 | **Demo en vivo** | Ver guion abajo | 3:00 |
| 11 | Conclusiones | RAG vs. fine-tuning; empresa con datos diarios → RAG | 1:00 |
| 12 | Preguntas | — | — |

## Guion de la demo en vivo

1. **Presentar la interfaz.** "Arriba se ve la configuración: 6 documentos, 45 fragmentos, embeddings de 384 dimensiones y el LLM que estamos usando."
2. **Pestaña "Fragmentos (chunking)".** Elegir `biblioteca.txt` y mostrar que cada fragmento tiene sección, longitud y vector. "Esto es lo que se guarda en la base vectorial."
3. **Pregunta que sí está:** *¿Cuánto cuesta un examen extraordinario?*
   - Mostrar la respuesta ($450 MXN, máximo 2 por semestre) con la cita **[1]**.
   - Hacer clic en la cita para resaltar la fuente y señalar la similitud (≈ 0.83).
   - Mostrar los 4 pasos: embedding → búsqueda → filtro → LLM, con sus tiempos.
   - Abrir **"Ver el prompt que se envió al LLM"**: "El LLM no busca nada; nosotros le damos los fragmentos."
4. **Pregunta con otras palabras:** *¿Cuánto es la multa por entregar tarde un libro?* El documento dice "retraso en la devolución" y aun así lo encuentra (0.74). "Esto es búsqueda **semántica**, no por palabras clave."
5. **Pregunta de un PDF:** *¿Puedo usar inteligencia artificial en mis tareas?* Responde desde `codigo_de_conducta.pdf` (demuestra la lectura de PDF).
6. **Pregunta fuera de tema:** *¿Cuál es la capital de Francia?* "El modelo sabe que es París, pero **no está en los documentos**, así que se abstiene. Todos los fragmentos quedaron debajo del umbral (0.16 < 0.35) y ni siquiera se llamó al LLM."
7. **Pregunta del mismo tema sin respuesta:** *¿Cuánto gana el director del instituto?* "Aquí sí pasan fragmentos el umbral (0.56), porque hablan del instituto, pero ninguno menciona salarios. La segunda capa, la instrucción al LLM, hace que responda que no tiene información."
8. **(Opcional) Mover el umbral a 0** y repetir la pregunta de Francia, para mostrar que entonces se apoya solo en la capa 2.
9. **(Opcional) Actualización instantánea:** editar un dato en un documento (por ejemplo, el costo del extraordinario a $500), ejecutar `npm run ingest`, reiniciar y preguntar de nuevo. "Así se actualiza el conocimiento sin reentrenar."

## Preguntas probables del profesor y respuestas

**¿Por qué fragmentos de 700 caracteres?**
Lo decidimos con un experimento (tabla en `ARQUITECTURA.md`). Con 500 caracteres, la oración "la calificación mínima es 70" quedaba separada de su sección y no se recuperaba, así que el LLM respondía "no se especifica". Con 700 caracteres, cada sección cabe completa en un fragmento y se recuperó el dato correcto en 13 de 13 preguntas. Con 900 ya no mejoraba y los prompts eran más largos. Fragmentos muy pequeños pierden contexto; fragmentos muy grandes mezclan temas y "diluyen" el vector.

**¿Para qué sirve el overlap?**
Si una oración importante queda partida entre dos fragmentos, el solapamiento hace que ambos conserven el contexto. Usamos 120 caracteres (≈ 17 %).

**¿Qué es la similitud coseno?**
Es el coseno del ángulo entre dos vectores. Vale 1 si apuntan en la misma dirección (mismo significado) y 0 si son perpendiculares (sin relación). Como normalizamos los vectores, se calcula con un producto punto.

**¿Por qué usaron su propia base vectorial y no Chroma o Pinecone?**
Para entender y explicar el mecanismo completo. Con 45 vectores, una búsqueda exhaustiva tarda menos de 1 ms. Para millones usaríamos Chroma, Qdrant o pgvector con índices HNSW. Nuestra clase `VectorStore` tiene la misma interfaz (`add`, `search`), así que se puede reemplazar fácilmente.

**¿Por qué ese modelo de embeddings?**
Es multilingüe (funciona bien en español), es pequeño (~120 MB) y corre localmente sin costo. Los documentos no salen de la computadora durante la indexación.

**¿Cómo eligieron el umbral de 0.35?**
Empíricamente, con `npm run evaluar`. Las preguntas válidas tuvieron similitudes de 0.49 a 0.85, y las de otros temas, de 0.16 a 0.28. El 0.35 queda entre ambos grupos.

**¿Qué pasa si la respuesta está repartida en varios documentos?**
Por eso recuperamos top-k = 4 fragmentos, que pueden ser de documentos distintos. El LLM los combina y cita cada uno.

**¿El LLM puede inventar algo de todos modos?**
Se reduce mucho, pero no a cero. Por eso el system prompt le prohíbe usar conocimiento propio, se le pide citar cada dato y la interfaz muestra las fuentes para que el usuario verifique.

**¿Cuál es la diferencia con solo conectar un chatbot?**
Un chatbot solo responde con lo que aprendió en su entrenamiento. Aquí hay un paso previo de **recuperación**: buscamos en nuestros documentos y le damos al LLM solo la evidencia relevante. Eso se ve en el panel de fragmentos recuperados y en el prompt.

**¿Cómo mejorarían el sistema?**
Con búsqueda híbrida (semántica + palabras clave BM25), un *re-ranker* (cross-encoder) para reordenar los fragmentos, un mejor modelo de embeddings (por ejemplo, `multilingual-e5`), filtros por metadatos, reindexación incremental y memoria de conversación para preguntas de seguimiento.
