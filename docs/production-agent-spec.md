# Content Engine v2 — Especificación de Producción para Agente GPT‑5.5

Versión: 2.1 — producción endurecida  
Owner: Adrian / M8 Apps  
Repo objetivo: `/home/m8apps/projects/content-engine-v2`  
Archivo fuente relacionado: `content-engine-v2-source-map.md`  
Estado: especificación autoritativa para construcción de la app

---

## 0. Cómo debe usar este archivo el agente GPT‑5.5

Este documento es el contrato completo para construir Content Engine v2. No es una lluvia de ideas. No es un brief creativo. No es una referencia parcial.

El agente debe actuar como:

- arquitecto senior de producto y software
- full-stack engineer senior
- engineer de AI workflows
- engineer de video pipeline
- reviewer estricto de seguridad, QA y datos

### Modo operativo obligatorio

1. Leer este archivo completo antes de modificar código.
2. Si el repo no existe, crearlo desde cero.
3. Si el repo existe, auditarlo antes de cambiarlo.
4. No copiar arquitectura, workflows, UI, Remotion, render pipeline ni patrones de Content Engine v1 o Bobi Video App.
5. Implementar por vertical slices, no por capas aisladas.
6. No crear features visuales o providers avanzados antes de que funcionen: evidencia → ángulos → guiones → aprobación → storyboard → draft → QA.
7. No aceptar outputs de IA sin validar contra schemas estrictos.
8. No permitir que un claim público llegue a guion, storyboard o video sin mapeo a evidencia.
9. No publicar ni exportar como final sin aprobación explícita y QA aprobado.
10. Hacer assumptions razonables cuando algo no bloquee; documentarlas en `docs/assumptions.md`.
11. Preguntar solo si existe un bloqueo real que no pueda resolverse con un default seguro.
12. Después de cada vertical slice, correr tests, typecheck y smoke checks relevantes.

### Formato de trabajo esperado del agente

Para cada fase, el agente debe entregar:

```txt
1. Qué cambió
2. Archivos modificados/creados
3. Tests ejecutados
4. Resultado de tests
5. Riesgos pendientes
6. Próximo paso recomendado
```

### Prohibición crítica

No empieces por video final, avatares, WaveSpeed, HeyGen, publicación o automatizaciones complejas. Eso sería construir una fábrica antes de validar que el sistema produce buenas historias.

El núcleo diferencial es:

```txt
evidencia real → ángulos fuertes → guiones verificables → aprobación humana → storyboard → draft → QA
```

---

## 1. Decisión base

Content Engine v2 reemplaza desde cero a Content Engine v1.

No se usa Content Engine v1 para nada:

- no prompts
- no workflow
- no critic
- no script generator
- no estructura
- no outputs
- no migración inicial
- no arquitectura
- no UI
- no nombres de módulos
- no patrones de jobs

La app nueva nace limpia.

Video App en Bobi se usa únicamente para identificar proveedores ya usados y variables de entorno compatibles. Aun así, la lista final de providers queda definida por esta especificación v2.

No se usa Video App como referencia de:

- arquitectura
- Remotion
- composición
- workflow
- UI
- calidad creativa
- render pipeline
- lógica de jobs
- lógica de aprobación

Esto evita contaminar Content Engine v2 con patrones inferiores o heredados.

---

## 2. Objetivo del producto

Crear una app que convierta evidencia real del trabajo diario de M8 Apps en contenido social corto para:

- emprendedores
- pymes
- founders
- negocios que quieren usar IA/tech para crecer, ahorrar tiempo, producir más y competir mejor

El sistema debe convertir trabajo real en historias atractivas, verificables y visualmente claras.

No debe producir reportes técnicos.

No debe producir contenido genérico.

No debe inventar logros, métricas, screenshots, resultados ni claims.

### Resultado de negocio

Content Engine v2 debe ayudar a M8 Apps a publicar contenido que demuestre, con evidencia real, que la empresa usa IA/tech para crear sistemas útiles, rápidos y poderosos para negocios reales.

### Tesis del producto

La mayoría del contenido de agencias y builders falla porque muestra:

- stock genérico
- claims vagos
- jerga técnica
- videos sin prueba visual
- storytelling débil
- resultados que parecen inventados

Content Engine v2 debe hacer lo contrario:

```txt
prueba real + historia clara + beneficio para negocio + visual fuerte + QA estricto
```

---

## 3. Usuarios y roles

### Audiencia externa

El contenido producido se dirige a:

- dueños de pymes
- founders
- emprendedores no técnicos
- operadores de negocios
- equipos que quieren automatizar procesos
- negocios que quieren adoptar IA sin volverse técnicos

### Usuarios internos de la app

#### owner

Usuario principal. En MVP, este rol corresponde a Adrian.

Puede:

- crear jobs
- subir evidencia
- aprobar/rechazar guiones
- aprobar/rechazar storyboard
- aprobar/rechazar QA
- aprobar publicación
- conectar providers
- ver costos
- ver logs

#### editor

Puede:

- subir evidencia
- revisar ángulos
- pedir cambios
- revisar drafts
- ejecutar QA

No puede:

- publicar
- conectar YouTube OAuth
- aprobar publicación final

#### reviewer

Puede:

- ver jobs
- comentar
- aprobar/rechazar en gates asignados si el owner lo permite

#### viewer

Puede:

- ver jobs y outputs
- no puede ejecutar acciones con side effects

#### service_worker

Identidad interna para workers async.

Puede:

- ejecutar tareas
- escribir outputs validados
- registrar provider events

No puede:

- aprobar gates
- publicar
- modificar configuración sensible

---

## 4. Scope del MVP

### MVP incluido

El MVP debe incluir:

1. Repo limpio.
2. Dashboard básico.
3. Modelo de datos con estados y transiciones server-side.
4. Source Registry validado.
5. Carga manual de evidencia.
6. Recolección desde rutas auditadas del Source Registry.
7. Story Miner que produce 3 ángulos.
8. Scriptwriter que produce 2–3 guiones por ángulo aprobado o seleccionado.
9. Claim-to-evidence mapping obligatorio.
10. Gate A — aprobación de guion.
11. Production Plan.
12. Storyboard Preview.
13. Draft render básico.
14. QA scoring.
15. Gate B — publish readiness.
16. Export local de video aprobado.
17. Provider registry con mocks inicialmente.
18. Pexels real después de que el pipeline base funcione.
19. ElevenLabs real después de que el draft pipeline funcione.
20. Logs, audit trail y provider events.
21. Tests mínimos por vertical slice.

### MVP excluido

No construir en MVP inicial:

- full autopublishing sin revisión humana
- descarga automática de YouTube sin aprobación explícita
- uso de material no autorizado
- self-learning público
- training/fine-tuning
- edición colaborativa compleja tipo Figma
- calendario editorial avanzado
- análisis de performance social avanzado
- multi-tenant SaaS público
- facturación
- mobile app nativa
- generación masiva sin revisión
- avatars por defecto
- WaveSpeed por defecto

### Regla de scope

Si una feature no mejora directamente la cadena:

```txt
evidencia → ángulo → guion → aprobación → storyboard → draft → QA
```

queda fuera del MVP inicial.

---

## 5. Platform Output Contract

El producto debe producir primero shorts verticales.

### Plataformas primarias

- Instagram Reels
- TikTok
- YouTube Shorts

### Formato primario

```txt
aspect_ratio: 9:16
resolution: 1080x1920
fps: 30
duration_target_sec: 35-55
duration_hard_min_sec: 20
duration_hard_max_sec: 75
container: mp4
video_codec: h264
audio_codec: AAC
captions: burned-in required
safe_zones: required
```

### Plataformas secundarias post-MVP

- LinkedIn vertical o square
- YouTube horizontal
- X video

### Reglas visuales obligatorias

1. El primer frame debe tener prueba visual o promesa clara.
2. Los primeros 2 segundos deben comunicar curiosidad, resultado o dolor.
3. El video debe sostener una sola idea central.
4. Máximo 3 beats principales por short.
5. Los captions deben ser legibles en móvil.
6. Máximo recomendado: 7 palabras por caption card.
7. No usar stock genérico en los primeros 5 segundos si existe evidencia real.
8. No usar avatar si tapa o debilita la evidencia.
9. No usar elementos visuales que sugieran un resultado que no está probado.
10. No mostrar datos sensibles en screenshots.

### Naming convention de export

```txt
outputs/drafts/{job_id}/{script_id}/draft_v{n}.mp4
outputs/final/{job_id}/{script_id}/final_v{n}.mp4
outputs/storyboards/{job_id}/{script_id}/storyboard_v{n}.json
outputs/contact-sheets/{job_id}/{script_id}/contact_sheet_v{n}.png
```

---

## 6. Fuentes de evidencia

Content Engine v2 no escanea todo el disco.

Usa un Source Registry auditado, versionado y mantenido aparte para evitar ruido, costos, errores y exposición de información privada.

Archivo operativo obligatorio:

```txt
content-engine-v2-source-map.md
```

Ese archivo debe vivir en:

```txt
/home/m8apps/projects/content-engine-v2/content-engine-v2-source-map.md
```

o en una ruta configurada por:

```env
SOURCE_REGISTRY_PATH=
```

### 6.1 Contrato mínimo de `content-engine-v2-source-map.md`

El Source Registry debe contener estas secciones:

```md
# Content Engine v2 — Source Map

## 1. Hosts válidos
- host_id:
- hostname:
- os:
- base_paths:
- status: active | inactive | archived

## 2. Titan OS Registry
- registry_path:
- allowed_projects:
- last_validated_at:

## 3. Proyectos permitidos
- project_id:
- public_name:
- internal_name:
- repo_path:
- screenshot_paths:
- screen_recording_paths:
- asset_paths:
- demo_urls:
- allowed_public_claims:
- prohibited_public_claims:
- client_privacy_level: public | internal | confidential | restricted
- status: active | paused | archived

## 4. Librerías de assets
- library_id:
- type: music | sfx | user_clip | broll | brand_asset
- path:
- rights_status: owned | licensed | unknown | prohibited
- attribution_required: true | false

## 5. Exclusiones
- path:
- reason:

## 6. Validación
- last_validated_at:
- validated_by:
- missing_paths:
- invalid_paths:
- warnings:
```

### 6.2 Prioridad obligatoria de evidencia

Orden de prioridad:

1. screenshots reales del proyecto real
2. screen recordings reales del proyecto real
3. assets reales del proyecto
4. clips del usuario
5. datos de Titan OS Registry / git / last_task para contexto
6. métricas verificables proporcionadas por el usuario
7. Pexels como apoyo visual
8. WaveSpeed como apoyo visual/generativo
9. YouTube autorizado como referencia/asset permitido

### 6.3 Regla principal de evidencia

Si el proyecto real se puede abrir o mostrar, Content Engine v2 debe mostrar el proyecto real antes que stock, generativo o material genérico.

### 6.4 Tipos de evidencia

```txt
evidence_type:
- screenshot
- screen_recording
- project_asset
- user_clip
- demo_url
- git_context
- task_note
- metric
- customer_quote
- owner_note
- pexels_asset
- wavespeed_asset
- youtube_authorized_asset
- music_asset
- sfx_asset
```

### 6.5 Niveles de soporte de claims

```txt
claim_support_level:
- direct
- inferred
- weak
- unsupported
```

Definiciones:

- `direct`: la evidencia prueba el claim de forma clara.
- `inferred`: la evidencia sugiere el claim, pero requiere lenguaje suave.
- `weak`: el claim puede ser razonable, pero necesita aprobación humana explícita.
- `unsupported`: el claim no puede usarse.

### 6.6 Regla claim-to-evidence

Todo claim factual que aparezca en contenido público debe mapearse a uno o más `evidence_items`.

Ejemplos de claims factuales:

- “Antes esto tomaba días.”
- “Ahora se puede hacer en minutos.”
- “Automatizamos el proceso.”
- “Esto reduce trabajo manual.”
- “El sistema responde más rápido.”
- “El negocio puede vender sin contratar más equipo.”

Reglas:

- Claims `unsupported` no pueden pasar a guion.
- Claims `weak` requieren reescritura o aprobación humana explícita.
- Claims `inferred` deben usar lenguaje prudente: “puede ayudar”, “reduce fricción”, “permite avanzar más rápido”.
- Claims `direct` pueden usarse si no violan privacidad ni derechos.

---

## 7. Principio narrativo obligatorio

Todo contenido generado por Content Engine v2 debe verse desde este marco:

```txt
Hice esto con IA/tech para lograr X.
Lo hice usando este método impresionante.
Ese método produjo beneficios concretos:
rapidez, ahorro, precisión, libertad, autonomía, más capacidad de iterar,
menos dependencia, más control o ventaja competitiva.
```

Este marco guía:

- selección de evidencia
- generación de ángulos
- escritura del hook
- beats del guion
- storyboard
- visuales
- captions
- CTA
- QA

### 7.1 Preguntas obligatorias para cada historia

Antes de generar un ángulo o guion, el sistema debe responder:

1. ¿Qué hice con IA/tech?
2. ¿Qué quería lograr?
3. ¿Cuál fue el método impresionante?
4. ¿Por qué ese método es mejor que la forma tradicional?
5. ¿Qué beneficios concretos produjo?
6. ¿Cuál de esos beneficios le importa más a un emprendedor/pyme?
7. ¿Qué evidencia visual demuestra esto?
8. ¿Qué claims NO puedo decir porque no están probados?
9. ¿Qué información privada debo ocultar?
10. ¿Qué visual real debe aparecer primero?

### 7.2 Beneficios que debe buscar el sistema

El Story Miner y el Scriptwriter deben detectar y destacar beneficios como:

- rapidez
- ahorro
- precisión
- libertad
- autonomía
- menos dependencia de terceros
- capacidad de producir más
- iteración rápida
- reducción de costos
- claridad
- escalabilidad
- control
- velocidad de aprendizaje
- ventaja competitiva
- menor fricción operativa
- menos trabajo manual
- mejor experiencia para clientes

### 7.3 Regla de framing

No contar la historia como:

```txt
Implementamos una solución técnica.
```

Contarla como:

```txt
Usé IA/tech para conseguir un resultado que antes era lento, caro o difícil,
con un método mucho más poderoso, y eso desbloqueó beneficios reales para un negocio.
```

### 7.4 Checklist de aceptación del ángulo

Un ángulo solo es válido si contiene:

- qué se hizo con IA/tech
- para qué se hizo
- qué método fue impresionante
- qué beneficio concreto produjo
- por qué le importa a emprendedores/pymes
- qué evidencia visual se puede mostrar
- qué claim principal se puede probar
- qué riesgos de privacidad o exageración existen

Si falta uno, el ángulo se rechaza.

---

## 8. Reglas de contenido público

### Permitido

- “Hice X con IA.”
- “Logramos X con IA/tech.”
- “Esto ayuda a una pyme a...”
- “Antes esto tomaba días.”, solo si hay evidencia o nota aprobada.
- “Ahora se puede iterar más rápido.”, si el claim es directo o inferido razonablemente.
- “El método fue...”
- “Lo impresionante fue...”
- “El resultado fue...”
- “Esto da más libertad/autonomía/velocidad/control.”

### Prohibido

- guion primero
- aprobación
- feedback público
- workflow gate
- critic score
- smoke test
- pipeline interno
- arquitectura técnica como narrativa principal
- “se implementó”
- jerga de dev como narrativa principal
- claims sin evidencia
- claims de ingresos sin fuente aprobada
- claims de ahorro de tiempo sin fuente aprobada
- nombres de clientes confidenciales
- screenshots con PII visible
- tokens, keys, URLs privadas o datos internos

### Lenguaje a evitar

```txt
implementamos
pipeline
arquitectura
backend
frontend
API endpoint
worker queue
critic score
approval gate
schema validation
smoke test
internal feedback
```

Estas palabras pueden existir internamente, pero no deben ser la narrativa principal del contenido público.

### Tono público

El tono debe ser:

- claro
- directo
- emocionado sin exagerar
- aspiracional
- útil para negocios
- cero jerga innecesaria
- cero reporte técnico
- cero “mira qué complejo soy”

---

## 9. Definición de buen video

Un buen short de Content Engine v2 debe cumplir:

1. Muestra prueba o promesa clara en los primeros 2 segundos.
2. Tiene una sola idea central.
3. El beneficio para una pyme es obvio.
4. El método se siente interesante o poderoso.
5. El video no depende de jerga técnica.
6. Cada claim factual está respaldado por evidencia.
7. Los captions son legibles sin audio.
8. La voz/audio es claro.
9. El ritmo visual mantiene atención sin tapar el mensaje.
10. El cierre invita a pensar, comentar o pedir ayuda sin sonar genérico.

### Reglas de ritmo

- Hook: 0–3s
- Contexto: 3–8s
- Método: 8–22s
- Resultado/beneficio: 22–40s
- CTA/cierre: últimos 3–8s

Estas ventanas son orientativas. El guion puede variar si el resultado mejora.

### CTA permitido

Ejemplos:

```txt
Si tienes un proceso repetitivo en tu negocio, probablemente se puede convertir en sistema.

Esto es lo que pasa cuando dejas de hacer procesos manuales y empiezas a construir herramientas.

Si tu negocio depende de tareas repetitivas, ahí hay una oportunidad enorme para usar IA bien.
```

CTA prohibido:

```txt
Compra ahora.
Sígueme para más.
Agenda una llamada ya.
Link en bio.
```

No están prohibidos para siempre, pero no deben ser el default del MVP.

---

## 10. Golden examples

Estos ejemplos son patrones de calidad. El agente debe crear más ejemplos reales durante la implementación en `evals/golden/`.

### 10.1 Ejemplo fuerte

Input evidence:

```txt
- screenshot de dashboard real mostrando flujo automatizado
- screen recording de usuario completando un proceso
- nota interna aprobada: “este proceso antes requería revisión manual diaria”
```

Buen ángulo:

```txt
Usé IA para convertir un proceso manual de revisión en un flujo automático que ayuda a una pyme a responder más rápido sin depender de revisar todo a mano.
```

Por qué es bueno:

- dice qué se hizo
- dice para qué sirve
- conecta con pyme
- muestra beneficio concreto
- puede mostrar evidencia real
- no usa jerga

Mal ángulo:

```txt
Construimos un pipeline con clasificación automática, workers y validación de estado.
```

Por qué es malo:

- demasiado técnico
- no comunica beneficio
- no le importa a una pyme
- suena como reporte interno

### 10.2 Ejemplo de claim no permitido

Claim:

```txt
Esto aumentó las ventas 40%.
```

Estado:

```txt
unsupported
```

Acción:

```txt
Bloquear. No usar salvo que exista métrica aprobada y evidencia directa.
```

Versión segura:

```txt
Esto crea una base para responder más rápido y perder menos oportunidades por procesos manuales.
```

### 10.3 Ejemplo de lenguaje correcto

Malo:

```txt
Implementamos un backend con endpoints para automatizar la captación de leads.
```

Bueno:

```txt
Convertí la captación de leads en un sistema que puede responder y organizar oportunidades sin que el dueño esté pegado a una hoja de cálculo.
```

---

## 11. Stack técnico decidido

### App web

- Next.js 15+
- React
- TypeScript strict mode
- Tailwind
- Material Symbols Outlined para iconos
- Zod para validación runtime en frontend/API

### Backend/API

- Next.js route handlers para API web del MVP
- SQLite con `better-sqlite3`
- migraciones SQL versionadas
- repository layer explícito
- server-side state machine

### Crew / AI service

- Python 3.11+
- CrewAI
- Pydantic v2
- FastAPI para worker/service
- CLI runner opcional para tareas locales
- outputs JSON versionados
- modelos vía APIs cloud/configuradas
- no modelos locales para LLM, voz, imagen o video

### Video

Motor nuevo desde cero.

Decisión MVP:

- Remotion fresco para composición basada en timeline propio
- ffmpeg para encoding/post-processing
- captions/overlays/timeline propios

Regla:

```txt
Remotion está permitido como tecnología de render.
Lo prohibido es copiar arquitectura, composición, timeline model,
render pipeline o UI desde Bobi Video App.
```

### Infra local MVP

- SQLite local
- filesystem local para outputs
- workers locales
- `.env.local` para desarrollo
- logs estructurados en archivos y DB

### Futuro post-MVP

- Postgres
- object storage
- Redis queue
- hosted workers
- multi-user auth real
- deployment cloud

No implementar estos antes de que el MVP local funcione.

---

## 12. Estructura del repo

```txt
content-engine-v2/
  apps/
    web/
      app/
      components/
      lib/
      routes/
      tests/
  services/
    crew/
      agents/
      tasks/
      crews/
      schemas/
      tools/
      evals/
      tests/
      main.py
  packages/
    core/
      src/
        artifacts/
        state-machine/
        schemas/
        db/
        errors/
        audit/
      tests/
    providers/
      src/
        pexels/
        wavespeed/
        heygen/
        elevenlabs/
        kreado/
        youtube/
        local-music/
        user-clips/
        source-registry/
      tests/
    video/
      src/
        timeline/
        renderer/
        captions/
        contact-sheet/
        remotion/
        ffmpeg/
      tests/
    qa/
      src/
        claim-checks/
        visual-checks/
        rights-checks/
        scoring/
      tests/
  workers/
    pipeline-runner/
      src/
      tests/
  data/
    migrations/
    content-engine-v2.sqlite
  docs/
    assumptions.md
    architecture.md
    provider-contracts.md
    qa-rubric.md
  outputs/
    evidence/
    angles/
    scripts/
    storyboards/
    previews/
    drafts/
    final/
    qa/
    contact-sheets/
  evals/
    golden/
    weak-evidence/
    unsupported-claims/
    internal-language/
  scripts/
    dev.sh
    test.sh
    migrate.sh
    smoke.sh
  .env.example
  README.md
  content-engine-v2-source-map.md
```

---

## 13. Configuración y environment variables

Crear `.env.example` con:

```env
# App
NODE_ENV=development
APP_BASE_URL=http://localhost:3000
DATABASE_PATH=./data/content-engine-v2.sqlite
OUTPUTS_PATH=./outputs
SOURCE_REGISTRY_PATH=./content-engine-v2-source-map.md

# OpenAI / GPT-5.5
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
OPENAI_DEFAULT_REASONING_EFFORT=medium
OPENAI_DEFAULT_VERBOSITY=medium

# Providers
WAVESPEED_API_KEY=
PEXELS_API_KEY=
PEXELS_KEY=
HEYGEN_API_KEY=
ELEVENLABS_API_KEY=
KREADO_API_KEY=
KREADO_AVATAR_ID=
KREADO_VOICE_ID=

# YouTube
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=
YOUTUBE_DOWNLOADS_PATH=./outputs/youtube-downloads
YTDLP_BIN=yt-dlp

# Local assets
LOCAL_MUSIC_LIBRARY_PATH=
LOCAL_SFX_LIBRARY_PATH=
USER_CLIPS_LIBRARY_PATH=
UPLOADS_PATH=./outputs/uploads

# Worker
PIPELINE_RUNNER_PATH=./workers/pipeline-runner
PYTHON_BIN=python3
CREW_SERVICE_URL=http://localhost:8000

# Feedback
VIDEO_OPS_FEEDBACK_WEBHOOK_URL=
VIDEO_OPS_FEEDBACK_WEBHOOK_TOKEN=
```

### Secrets policy

- Nunca commitear `.env`, `.env.local` ni secrets reales.
- Nunca loggear API keys.
- Nunca guardar OAuth tokens sin cifrado en producción.
- En MVP local, si se guardan tokens, marcarlos claramente como `development_only`.
- Separar credenciales de generación y publicación.
- El worker de generación no debe tener permiso de publicación salvo que sea estrictamente necesario.

---

## 14. GPT‑5.5 Runtime Contract

### Modelo

Default:

```txt
gpt-5.5
```

Permitir override por env:

```env
OPENAI_MODEL=
```

### API

Usar Responses API para tareas con:

- razonamiento
- tool-calling
- outputs estructurados
- workflows multi-step
- generación de artifacts versionados

### Reasoning effort

```txt
low:
- clasificación simple
- metadata cleanup
- normalización de evidencia
- detección simple de lenguaje prohibido

medium:
- Story Miner
- Scriptwriter
- Production Plan
- QA estándar

high:
- claim verification complejo
- debugging de pipeline
- arquitectura
- eval analysis
- revisión de seguridad/derechos

xhigh:
- usar solo si evals demuestran mejora clara
```

Default recomendado:

```txt
medium
```

### Verbosity

```txt
low:
- clasificaciones internas
- flags
- checks simples

medium:
- scripts
- QA reports
- production plans

high:
- architecture reviews
- implementation plans
- failure analysis
```

### Structured Outputs

Todos los artifacts generados por IA deben producirse con schema estricto.

Prohibido aceptar:

- JSON libre no validado
- claves inventadas
- enums fuera de contrato
- artifacts sin versión
- outputs que no referencian evidencia existente

Regla:

```txt
model output → schema validation → business validation → DB write
```

Nunca:

```txt
model output → DB write
```

### Tool usage

Cada tool debe tener:

- nombre claro
- cuándo usarla
- cuándo no usarla
- input schema
- output schema
- side effects
- retry policy
- timeout
- cost tracking
- logging
- errores esperados

### Prompting style para GPT‑5.5

Usar prompts outcome-first.

El prompt debe decir:

- objetivo
- audiencia
- evidencia disponible
- constraints
- success criteria
- output schema
- rejection rules

Evitar prompts enormes de pasos rígidos salvo que el camino sea obligatorio.

---

## 15. Provider tiers

Para evitar scope creep, los providers se dividen en tiers.

### Tier 0 — Obligatorio para MVP base

- Source Registry local
- uploads manuales
- user clips local
- local filesystem outputs
- mock providers
- Remotion/ffmpeg local render

### Tier 1 — MVP real después del pipeline base

- Pexels
- ElevenLabs
- local music/SFX

### Tier 2 — Post-MVP controlado

- WaveSpeed
- HeyGen
- Kreado
- YouTube private upload/draft

### Tier 3 — Solo después de QA fuerte

- YouTube publish público
- YouTube downloads
- feedback loops automáticos
- generation at scale

Regla:

```txt
No integrar Tier 2/3 antes de que Tier 0/1 esté probado con evals y un draft local funcional.
```

---

## 16. Tool/provider contracts

### 16.1 `validate_source_registry`

Uso:

- Validar `content-engine-v2-source-map.md`.
- Confirmar que rutas existen.
- Confirmar que proyectos tienen privacy level.

No usar:

- Para escanear todo el disco.

Input:

```json
{
  "source_registry_path": "string"
}
```

Output:

```json
{
  "valid": true,
  "snapshot_id": "string",
  "missing_paths": [],
  "invalid_paths": [],
  "warnings": []
}
```

Side effects:

- Crea `source_registry_snapshots`.

Retry:

- No retry automático si el archivo no existe.

---

### 16.2 `collect_project_evidence`

Uso:

- Recolectar evidencia desde rutas allowlisted.

No usar:

- Para leer carpetas excluidas.
- Para leer proyectos confidenciales sin allowlist.

Input:

```json
{
  "job_id": "string",
  "project_id": "string",
  "evidence_types": ["screenshot", "screen_recording", "project_asset", "task_note", "metric"]
}
```

Output:

```json
{
  "evidence_items": []
}
```

Side effects:

- Copia o referencia assets en `outputs/evidence/{job_id}`.
- Crea rows en `evidence_items`.

Retry:

- Retry permitido en errores temporales de filesystem.
- No retry si path está prohibido.

---

### 16.3 `privacy_scan_media`

Uso:

- Escanear screenshots, videos y assets antes de uso público.

Detectar:

- emails
- teléfonos
- API keys
- tokens
- URLs privadas
- nombres de clientes confidenciales
- facturas
- datos financieros
- mensajes privados
- claves de repos

Input:

```json
{
  "asset_path": "string",
  "privacy_level": "public | internal | confidential | restricted"
}
```

Output:

```json
{
  "public_safe": true,
  "findings": [],
  "redaction_required": false,
  "redacted_asset_path": null
}
```

Regla:

- Si `public_safe=false`, el asset no puede usarse en render público.

---

### 16.4 `search_pexels_clips`

Uso:

- Buscar b-roll cuando evidencia real no cubre un beat conceptual.

No usar:

- Para reemplazar evidencia real disponible.
- Para probar claims factuales.
- En los primeros 5 segundos si hay visual real.

Input:

```json
{
  "query": "string",
  "orientation": "portrait | landscape | square",
  "duration_sec_min": 3,
  "duration_sec_max": 12
}
```

Output:

```json
{
  "assets": [
    {
      "provider": "pexels",
      "asset_id": "string",
      "preview_url": "string",
      "download_url": "string",
      "license": "string",
      "attribution_required": false,
      "rights_status": "licensed"
    }
  ]
}
```

Retry:

- Retry 2 veces en 429/5xx con backoff.
- No retry si API key falta.

---

### 16.5 `generate_wavespeed_asset`

Uso:

- Crear apoyo visual/generativo cuando no existe evidencia real suficiente.

No usar:

- Para representar una pantalla, cliente, métrica o resultado real.
- Para simular evidencia.

Input:

```json
{
  "prompt": "string",
  "asset_type": "image | video",
  "aspect_ratio": "9:16 | 1:1 | 16:9",
  "style_constraints": []
}
```

Output:

```json
{
  "asset_id": "string",
  "asset_path": "string",
  "provider_event_id": "string",
  "rights_status": "generated"
}
```

Regla:

- Todo asset generado debe etiquetarse como `generated`.

---

### 16.6 `synthesize_voice_elevenlabs`

Uso:

- Generar voiceover final o draft.

Input:

```json
{
  "script_id": "string",
  "voice_text": "string",
  "voice_id": "string",
  "tone": "clear | energetic | calm"
}
```

Output:

```json
{
  "audio_path": "string",
  "duration_sec": 0,
  "provider_event_id": "string"
}
```

Regla:

- No generar voz antes de Gate A aprobado.

---

### 16.7 `generate_heygen_avatar`

Uso:

- Presenter/avatar solo si mejora claridad o confianza.

No usar:

- Como default.
- Si tapa evidencia visual.
- Antes de Gate A aprobado.

Input:

```json
{
  "script_id": "string",
  "avatar_id": "string",
  "voice_audio_path": "string",
  "layout": "picture_in_picture | full_frame"
}
```

Output:

```json
{
  "video_path": "string",
  "provider_event_id": "string"
}
```

---

### 16.8 `select_local_music_sfx`

Uso:

- Seleccionar música/SFX de librería aprobada.

No usar:

- Si rights metadata es unknown o prohibited.

Input:

```json
{
  "mood": "focused | energetic | cinematic | calm",
  "duration_sec": 45,
  "intensity": "low | medium | high"
}
```

Output:

```json
{
  "music_asset": {
    "path": "string",
    "rights_status": "owned | licensed",
    "attribution_required": false
  },
  "sfx_assets": []
}
```

---

### 16.9 `render_video_draft`

Uso:

- Renderizar draft desde storyboard aprobado internamente.

Input:

```json
{
  "job_id": "string",
  "storyboard_id": "string",
  "render_quality": "preview | draft | final"
}
```

Output:

```json
{
  "draft_id": "string",
  "video_path": "string",
  "contact_sheet_path": "string",
  "timeline_json_path": "string",
  "duration_sec": 0
}
```

Reglas:

- No render sin script aprobado.
- No final render sin QA aprobado.

---

### 16.10 `upload_youtube_draft`

Uso:

- Subir borrador privado o no listado después de QA aprobado y aprobación de publish.

No usar:

- Para publicación automática pública en MVP.

Input:

```json
{
  "job_id": "string",
  "video_path": "string",
  "privacy_status": "private | unlisted",
  "title": "string",
  "description": "string"
}
```

Output:

```json
{
  "publish_event_id": "string",
  "youtube_video_id": "string",
  "url": "string",
  "privacy_status": "private | unlisted"
}
```

Regla:

- Requiere aprobación explícita de publish.

---

## 17. CrewAI core

Content Engine v2 tiene roles principales y checks separados.

### 17.1 Story Miner / Strategist

Responsabilidad:

Une evidencia + lente M8 Apps.

Extrae:

- qué hicimos con IA/tech
- para lograr qué
- qué método fue impresionante
- qué beneficio tiene para emprendedores/pymes
- qué evidencia visual existe
- qué claims son posibles
- qué claims son peligrosos

Entrega 3 ángulos posibles.

No entrega un resumen.

Entrada:

```json
{
  "job_id": "string",
  "day_evidence": [],
  "screenshots": [],
  "clips": [],
  "demos": [],
  "metrics": [],
  "project_notes": [],
  "source_registry_snapshot_id": "string"
}
```

Output:

```json
{
  "artifact_version": "1.0",
  "job_id": "string",
  "angles": [
    {
      "id": "angle_1",
      "title": "string",
      "what_we_did_with_ai_or_tech": "string",
      "goal": "string",
      "impressive_method": "string",
      "why_method_is_impressive": "string",
      "benefits_for_smes": [],
      "visual_evidence_ids": [],
      "main_claims": [],
      "hook_potential": "string",
      "risk_or_weakness": "string",
      "privacy_risks": [],
      "acceptance_checklist": {
        "has_ai_or_tech_action": true,
        "has_goal": true,
        "has_impressive_method": true,
        "has_concrete_benefit": true,
        "has_sme_relevance": true,
        "has_visual_evidence": true
      }
    }
  ]
}
```

Reglas:

- Debe producir exactamente 3 ángulos.
- Cada ángulo debe tener beneficio claro para pymes.
- Cada ángulo debe mencionar método impresionante.
- Cada ángulo debe indicar evidencia visual disponible.
- Si no hay evidencia visual suficiente, debe marcarlo.
- No puede inventar métricas.
- No puede usar lenguaje interno como ángulo principal.

---

### 17.2 Audience Scriptwriter

Responsabilidad:

Escribe para emprendedores/pymes.

Tono:

- amigo emocionado
- claro
- aspiracional
- cero jerga
- cero lenguaje interno
- cero reporte técnico

Produce:

- 2–3 guiones cortos
- hook
- beats
- visual notes
- CTA natural
- claims estructurados

Output:

```json
{
  "artifact_version": "1.0",
  "job_id": "string",
  "scripts": [
    {
      "id": "script_1",
      "angle_id": "angle_1",
      "hook": "string",
      "voiceover": "string",
      "beats": [
        {
          "beat_id": "beat_1",
          "time_start_sec": 0,
          "time_end_sec": 3,
          "line": "string",
          "visual_question": "string",
          "suggested_visual": "string",
          "evidence_ids": []
        }
      ],
      "claims": [],
      "cta": "string",
      "duration_sec": 45,
      "public_language_check": {
        "no_internal_language": true,
        "no_dev_jargon_as_main_story": true,
        "no_unsupported_claims": true
      }
    }
  ]
}
```

Reglas:

- Escribe para pymes, no para developers.
- No usa lenguaje interno.
- No dice “se implementó”.
- No habla de gates, aprobación, workflow, critic score o feedback público.
- Cada guion responde al marco: hice esto con IA/tech → para lograr X → método impresionante → beneficios concretos.
- Todo claim factual debe aparecer en `claims`.
- No puede pasar a aprobación si tiene claims `unsupported`.

---

### 17.3 Claim Verifier

Responsabilidad:

Verifica que cada claim del guion tenga evidencia suficiente.

Input:

```json
{
  "script_id": "string",
  "claims": [],
  "evidence_items": []
}
```

Output:

```json
{
  "script_id": "string",
  "claim_checks": [
    {
      "claim_id": "string",
      "claim_text": "string",
      "support_level": "direct | inferred | weak | unsupported",
      "evidence_ids": [],
      "reason": "string",
      "public_safe": true,
      "requires_human_approval": false,
      "rewrite_suggestion": null
    }
  ],
  "overall_pass": true
}
```

Reglas:

- Si un claim es `unsupported`, `overall_pass=false`.
- Si un claim es `weak`, debe pedir rewrite o aprobación humana explícita.
- Debe sugerir lenguaje más prudente para claims inferidos.

---

### 17.4 Video Producer

Responsabilidad:

Convierte el guion elegido en plan de video.

Solo corre después de aprobación de Adrian o usuario con rol `owner`.

Produce:

- escenas
- assets necesarios
- screenshots/clips
- avatar/narración
- ritmo visual
- captions
- b-roll/demo captures

Output:

```json
{
  "artifact_version": "1.0",
  "production_plan": {
    "id": "production_plan_1",
    "job_id": "string",
    "script_id": "string",
    "scenes": [],
    "assets_needed": [],
    "screenshots_needed": [],
    "clips_needed": [],
    "avatar_plan": {},
    "voiceover_plan": {},
    "caption_style": {},
    "broll_plan": [],
    "demo_capture_plan": [],
    "visual_rhythm": "string",
    "rights_requirements": [],
    "privacy_requirements": []
  }
}
```

Reglas:

- No cambia el mensaje aprobado.
- No inventa claims.
- Todo claim debe sostenerse con evidencia.
- Prioriza evidencia visual real antes de stock/generativo.
- No agrega avatar si no mejora claridad.

---

### 17.5 Editor / Motion Assembler

Responsabilidad:

Produce storyboard preview y luego draft.

Produce:

- timeline
- cortes
- zooms
- overlays
- captions
- música/SFX si aplica
- render draft
- contact sheet

Output storyboard:

```json
{
  "artifact_version": "1.0",
  "storyboard": {
    "id": "storyboard_1",
    "job_id": "string",
    "script_id": "string",
    "production_plan_id": "string",
    "timeline": [],
    "cuts": [],
    "zooms": [],
    "overlays": [],
    "captions": [],
    "music_sfx": [],
    "preview_assets": [],
    "estimated_duration_sec": 45
  }
}
```

Output draft:

```json
{
  "draft": {
    "id": "draft_1",
    "job_id": "string",
    "script_id": "string",
    "storyboard_id": "string",
    "video_path": "string",
    "contact_sheet_path": "string",
    "timeline_json_path": "string",
    "notes": []
  }
}
```

Reglas:

- Primero preview visual rápido.
- Después draft.
- No render final sin QA.
- El movimiento debe apoyar el mensaje, no taparlo.
- No usar assets sin rights metadata.

---

### 17.6 QA Reviewer

Responsabilidad:

Evalúa draft, claims, visuales, derechos y publicación.

No reescribe el guion como default. Evalúa y devuelve pass/fail con razones.

Output:

```json
{
  "qa_report": {
    "id": "qa_1",
    "job_id": "string",
    "draft_id": "string",
    "scores": {
      "evidence_support": 5,
      "rights_safety": 5,
      "privacy_safety": 5,
      "sme_clarity": 5,
      "hook_strength": 5,
      "narrative_coherence": 5,
      "visual_proof": 5,
      "caption_readability": 5,
      "audio_quality": 5,
      "pace": 5
    },
    "blocking_issues": [],
    "non_blocking_issues": [],
    "pass": true,
    "publish_ready": true
  }
}
```

---

## 18. Gates fuera del crew

Los gates no viven dentro del writer.

Los gates controlan el proceso y se aplican server-side.

### 18.1 Gate A — Script Approval

Adrian/owner aprueba antes de producir.

Sin aprobación:

- no storyboard
- no voz
- no avatar
- no render
- no publicación

Estados:

```txt
script_pending_approval
script_approved
script_rejected
script_needs_revision
```

Requisitos para aprobar:

- script tiene schema válido
- todos los claims tienen mapping
- no hay claims unsupported
- claims weak fueron reescritos o aprobados explícitamente
- no hay lenguaje público prohibido
- el owner entiende el ángulo y el beneficio

### 18.2 Gate B — QA / Publish Readiness

Verifica:

- no claims falsos
- no lenguaje interno
- evidencia visible
- audio legible
- visual legible
- mensaje claro para pymes
- hook entendible
- beneficio concreto
- método impresionante claro
- no parece reporte técnico
- captions correctas
- ritmo suficiente
- derechos seguros
- privacidad segura

Estados:

```txt
qa_pending
qa_passed
qa_failed
needs_revision
publish_ready
```

Requisitos para `publish_ready`:

- QA pass true
- `evidence_support = 5`
- `rights_safety = 5`
- `privacy_safety = 5`
- ninguna categoría < 4
- no blocking issues
- aprobación explícita de publish

---

## 19. Flujo real

```txt
1. Crear job.
2. Validar Source Registry.
3. Recolectar evidencia del día desde proyectos reales:
   screenshots, screen recordings, assets, clips del usuario, URLs, demos y resultados visibles.
4. Correr privacy scan y rights scan.
5. Story Miner genera 3 ángulos.
6. Validar ángulos con checklist narrativo.
7. Scriptwriter genera 2–3 guiones.
8. Claim Verifier mapea claims a evidencia.
9. Selección/aprobación de Adrian.
10. Video Producer arma production plan.
11. Editor arma storyboard preview.
12. Revisión de storyboard.
13. Render draft.
14. QA visual/narrativo/derechos/privacidad.
15. Ajustes si falla.
16. Export final si QA pasa.
17. Publicación opcional solo con aprobación explícita.
```

---

## 20. Estados del job

```txt
created
evidence_collecting
evidence_collected
evidence_failed
angles_generating
angles_generated
angles_failed
scripts_generating
scripts_generated
script_pending_approval
script_needs_revision
script_rejected
script_approved
production_planning
production_planned
storyboard_generating
storyboard_ready
storyboard_needs_revision
rendering_draft
draft_rendered
qa_pending
qa_failed
qa_passed
publish_pending_approval
publish_ready
publishing
published
publish_failed
cancelled
archived
```

### 20.1 Transiciones permitidas

```txt
created -> evidence_collecting
evidence_collecting -> evidence_collected | evidence_failed | cancelled
evidence_collected -> angles_generating
angles_generating -> angles_generated | angles_failed
angles_generated -> scripts_generating
scripts_generating -> scripts_generated | angles_generated
scripts_generated -> script_pending_approval
script_pending_approval -> script_approved | script_rejected | script_needs_revision
script_needs_revision -> scripts_generating
script_approved -> production_planning
production_planning -> production_planned
production_planned -> storyboard_generating
storyboard_generating -> storyboard_ready
storyboard_ready -> storyboard_needs_revision | rendering_draft
storyboard_needs_revision -> production_planning | storyboard_generating
rendering_draft -> draft_rendered
 draft_rendered -> qa_pending
qa_pending -> qa_passed | qa_failed
qa_failed -> production_planning | storyboard_generating | rendering_draft
qa_passed -> publish_pending_approval | publish_ready
publish_pending_approval -> publish_ready | archived
publish_ready -> publishing
publishing -> published | publish_failed
publish_failed -> publish_ready | archived
```

Cualquier transición no listada debe devolver:

```json
{
  "error": "invalid_state_transition"
}
```

---

## 21. Structured artifacts y schemas obligatorios

Todos los artifacts deben tener:

```json
{
  "artifact_version": "1.0",
  "id": "string",
  "job_id": "string",
  "created_at": "ISO-8601",
  "created_by": "user | service | model",
  "source_model": "string | null"
}
```

### 21.1 Enums base

```txt
EvidenceType:
- screenshot
- screen_recording
- project_asset
- user_clip
- demo_url
- git_context
- task_note
- metric
- customer_quote
- owner_note
- pexels_asset
- wavespeed_asset
- youtube_authorized_asset
- music_asset
- sfx_asset

RightsStatus:
- owned
- licensed
- generated
- authorized
- unknown
- prohibited

PrivacyLevel:
- public
- internal
- confidential
- restricted

ClaimSupportLevel:
- direct
- inferred
- weak
- unsupported

ApprovalStatus:
- pending
- approved
- rejected
- needs_revision

ProviderStatus:
- not_configured
- configured
- healthy
- degraded
- failing
```

### 21.2 EvidenceItem

```json
{
  "id": "evi_...",
  "job_id": "job_...",
  "type": "screenshot",
  "title": "string",
  "description": "string",
  "path": "string | null",
  "url": "string | null",
  "source_project_id": "string | null",
  "rights_status": "owned | licensed | generated | authorized | unknown | prohibited",
  "privacy_level": "public | internal | confidential | restricted",
  "public_safe": true,
  "metadata": {},
  "created_at": "ISO-8601"
}
```

Business validation:

- `rights_status=prohibited` bloquea uso.
- `privacy_level=restricted` bloquea uso público.
- `public_safe=false` bloquea uso público.

### 21.3 StoryAngle

```json
{
  "id": "angle_...",
  "job_id": "job_...",
  "title": "string",
  "what_we_did_with_ai_or_tech": "string",
  "goal": "string",
  "impressive_method": "string",
  "why_method_is_impressive": "string",
  "benefits_for_smes": [],
  "visual_evidence_ids": [],
  "main_claims": [],
  "hook_potential": "string",
  "risk_or_weakness": "string",
  "privacy_risks": [],
  "score": 0,
  "status": "candidate | selected | rejected"
}
```

### 21.4 ScriptCandidate

```json
{
  "id": "script_...",
  "job_id": "job_...",
  "angle_id": "angle_...",
  "hook": "string",
  "voiceover": "string",
  "beats": [],
  "claims": [],
  "cta": "string",
  "duration_sec": 45,
  "status": "draft | pending_approval | approved | rejected | needs_revision"
}
```

Validation:

- `duration_sec` between 20 and 75.
- At least 3 beats.
- Hook not empty.
- CTA not empty.
- Claims array required.

### 21.5 ScriptClaim

```json
{
  "id": "claim_...",
  "script_id": "script_...",
  "claim_text": "string",
  "claim_type": "time_saving | cost_saving | automation | speed | quality | capacity | control | other",
  "support_level": "direct | inferred | weak | unsupported",
  "evidence_ids": [],
  "public_safe": true,
  "requires_human_approval": false,
  "rewrite_suggestion": "string | null"
}
```

Validation:

- `unsupported` blocks script approval.
- empty `evidence_ids` blocks factual claim.
- `weak` requires human approval or rewrite.

### 21.6 ProductionPlan

```json
{
  "id": "plan_...",
  "job_id": "job_...",
  "script_id": "script_...",
  "scenes": [],
  "assets_needed": [],
  "screenshots_needed": [],
  "clips_needed": [],
  "avatar_plan": {},
  "voiceover_plan": {},
  "caption_style": {},
  "broll_plan": [],
  "demo_capture_plan": [],
  "visual_rhythm": "string",
  "rights_requirements": [],
  "privacy_requirements": []
}
```

### 21.7 Storyboard

```json
{
  "id": "storyboard_...",
  "job_id": "job_...",
  "script_id": "script_...",
  "production_plan_id": "plan_...",
  "timeline": [],
  "cuts": [],
  "zooms": [],
  "overlays": [],
  "captions": [],
  "music_sfx": [],
  "preview_assets": [],
  "estimated_duration_sec": 45
}
```

Validation:

- Every scene must reference either evidence, generated asset, stock asset or explicit text/caption.
- Every factual beat must reference evidence.
- No asset with unsafe rights.

### 21.8 QAReport

```json
{
  "id": "qa_...",
  "job_id": "job_...",
  "draft_id": "draft_...",
  "scores": {},
  "blocking_issues": [],
  "non_blocking_issues": [],
  "pass": true,
  "publish_ready": true
}
```

---

## 22. Database schema MVP endurecido

Usar SQLite con foreign keys activadas.

Archivo inicial:

```txt
data/migrations/001_init.sql
```

Contenido mínimo:

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'reviewer', 'viewer', 'service_worker')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  target_platform TEXT NOT NULL DEFAULT 'vertical_short',
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

CREATE TABLE source_registry_snapshots (
  id TEXT PRIMARY KEY,
  registry_path TEXT NOT NULL,
  registry_hash TEXT NOT NULL,
  valid INTEGER NOT NULL DEFAULT 0,
  snapshot_json TEXT NOT NULL,
  warnings_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE evidence_items (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  path TEXT,
  url TEXT,
  source_project_id TEXT,
  rights_status TEXT NOT NULL DEFAULT 'unknown',
  privacy_level TEXT NOT NULL DEFAULT 'internal',
  public_safe INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_job_id ON evidence_items(job_id);
CREATE INDEX idx_evidence_type ON evidence_items(type);

CREATE TABLE asset_rights (
  id TEXT PRIMARY KEY,
  evidence_item_id TEXT,
  provider TEXT,
  license TEXT,
  rights_status TEXT NOT NULL,
  attribution_required INTEGER NOT NULL DEFAULT 0,
  attribution_text TEXT,
  source_url TEXT,
  checked_at TEXT NOT NULL,
  FOREIGN KEY (evidence_item_id) REFERENCES evidence_items(id) ON DELETE CASCADE
);

CREATE TABLE story_angles (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  title TEXT NOT NULL,
  angle_json TEXT NOT NULL,
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'candidate',
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_story_angles_job_id ON story_angles(job_id);

CREATE TABLE script_candidates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  angle_id TEXT NOT NULL,
  script_json TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_sec INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (angle_id) REFERENCES story_angles(id) ON DELETE CASCADE
);

CREATE INDEX idx_scripts_job_id ON script_candidates(job_id);
CREATE INDEX idx_scripts_status ON script_candidates(status);

CREATE TABLE script_claims (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  script_id TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  support_level TEXT NOT NULL,
  public_safe INTEGER NOT NULL DEFAULT 0,
  requires_human_approval INTEGER NOT NULL DEFAULT 0,
  rewrite_suggestion TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (script_id) REFERENCES script_candidates(id) ON DELETE CASCADE
);

CREATE INDEX idx_script_claims_script_id ON script_claims(script_id);
CREATE INDEX idx_script_claims_support ON script_claims(support_level);

CREATE TABLE claim_evidence_links (
  claim_id TEXT NOT NULL,
  evidence_item_id TEXT NOT NULL,
  support_note TEXT,
  PRIMARY KEY (claim_id, evidence_item_id),
  FOREIGN KEY (claim_id) REFERENCES script_claims(id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_item_id) REFERENCES evidence_items(id) ON DELETE CASCADE
);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  artifact_id TEXT,
  gate TEXT NOT NULL,
  status TEXT NOT NULL,
  approved_by TEXT,
  notes TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX idx_approvals_job_gate ON approvals(job_id, gate);

CREATE TABLE production_plans (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  script_id TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (script_id) REFERENCES script_candidates(id) ON DELETE CASCADE
);

CREATE TABLE storyboards (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  script_id TEXT NOT NULL,
  production_plan_id TEXT NOT NULL,
  storyboard_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (script_id) REFERENCES script_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (production_plan_id) REFERENCES production_plans(id) ON DELETE CASCADE
);

CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  script_id TEXT NOT NULL,
  storyboard_id TEXT NOT NULL,
  video_path TEXT NOT NULL,
  contact_sheet_path TEXT,
  timeline_json_path TEXT,
  render_status TEXT NOT NULL,
  duration_sec INTEGER,
  notes_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (script_id) REFERENCES script_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (storyboard_id) REFERENCES storyboards(id) ON DELETE CASCADE
);

CREATE TABLE qa_reports (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  report_json TEXT NOT NULL,
  pass INTEGER NOT NULL DEFAULT 0,
  publish_ready INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
);

CREATE TABLE provider_events (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  request_json TEXT,
  response_json TEXT,
  error_json TEXT,
  cost_estimate_usd REAL,
  latency_ms INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

CREATE INDEX idx_provider_events_job_id ON provider_events(job_id);
CREATE INDEX idx_provider_events_provider ON provider_events(provider);

CREATE TABLE publish_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  url TEXT,
  external_id TEXT,
  metadata_json TEXT,
  published_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE,
  FOREIGN KEY (published_by) REFERENCES users(id)
);

CREATE TABLE job_runs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error_json TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE task_runs (
  id TEXT PRIMARY KEY,
  job_run_id TEXT,
  job_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TEXT,
  finished_at TEXT,
  heartbeat_at TEXT,
  input_json TEXT,
  output_json TEXT,
  error_json TEXT,
  cost_estimate_usd REAL,
  FOREIGN KEY (job_run_id) REFERENCES job_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_runs_job_status ON task_runs(job_id, status);

CREATE TABLE artifact_versions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  artifact_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
```

---

## 23. API MVP contract

### 23.1 Reglas generales

Todas las mutaciones deben:

- validar input con Zod
- validar permisos
- validar estado actual del job
- crear audit log
- devolver errores estructurados

Todas las acciones con side effects deben aceptar:

```http
Idempotency-Key: <uuid>
```

Formato de error:

```json
{
  "error": {
    "code": "invalid_state_transition",
    "message": "Human readable message",
    "details": {}
  }
}
```

Códigos comunes:

```txt
invalid_request
unauthorized
forbidden
not_found
invalid_state_transition
schema_validation_failed
business_validation_failed
provider_not_configured
provider_failed
privacy_blocked
rights_blocked
unsupported_claim
```

### 23.2 Endpoints

```txt
GET    /api/health
GET    /api/providers/status

POST   /api/jobs
GET    /api/jobs
GET    /api/jobs/:id
PATCH  /api/jobs/:id

POST   /api/jobs/:id/evidence
GET    /api/jobs/:id/evidence
POST   /api/jobs/:id/collect-evidence

POST   /api/jobs/:id/story-angles
GET    /api/jobs/:id/story-angles
POST   /api/jobs/:id/select-angle

POST   /api/jobs/:id/scripts
GET    /api/jobs/:id/scripts
POST   /api/jobs/:id/verify-claims
POST   /api/jobs/:id/approve-script
POST   /api/jobs/:id/request-script-revision
POST   /api/jobs/:id/reject-script

POST   /api/jobs/:id/production-plan
GET    /api/jobs/:id/production-plan

POST   /api/jobs/:id/storyboard-preview
GET    /api/jobs/:id/storyboard
POST   /api/jobs/:id/approve-storyboard
POST   /api/jobs/:id/request-storyboard-revision

POST   /api/jobs/:id/render-draft
GET    /api/jobs/:id/drafts
GET    /api/jobs/:id/drafts/:draftId

POST   /api/jobs/:id/qa
GET    /api/jobs/:id/qa

POST   /api/jobs/:id/approve-publish
POST   /api/jobs/:id/export-final
POST   /api/jobs/:id/publish

GET    /api/jobs/:id/audit-log
GET    /api/jobs/:id/task-runs
```

### 23.3 Contract examples

#### POST `/api/jobs`

Request:

```json
{
  "title": "string",
  "description": "string",
  "target_platform": "vertical_short"
}
```

Response:

```json
{
  "job": {
    "id": "job_...",
    "title": "string",
    "status": "created"
  }
}
```

#### POST `/api/jobs/:id/story-angles`

Allowed states:

```txt
evidence_collected
angles_failed
```

Request:

```json
{
  "count": 3,
  "force_regenerate": false
}
```

Response:

```json
{
  "job_id": "job_...",
  "status": "angles_generated",
  "angles": []
}
```

#### POST `/api/jobs/:id/scripts`

Allowed states:

```txt
angles_generated
script_needs_revision
script_rejected
```

Request:

```json
{
  "angle_id": "angle_...",
  "count": 3,
  "style_profile_id": "default_sme_short"
}
```

Response:

```json
{
  "job_id": "job_...",
  "status": "scripts_generated",
  "scripts": []
}
```

#### POST `/api/jobs/:id/approve-script`

Allowed states:

```txt
script_pending_approval
scripts_generated
```

Request:

```json
{
  "script_id": "script_...",
  "approval_notes": "string",
  "weak_claim_approvals": []
}
```

Business rules:

- block if unsupported claims exist
- block if script has no claim-evidence mapping
- block if privacy unsafe evidence is referenced
- create approval row
- transition to `script_approved`

Response:

```json
{
  "job_id": "job_...",
  "status": "script_approved",
  "approved_script_id": "script_..."
}
```

#### POST `/api/jobs/:id/render-draft`

Allowed states:

```txt
storyboard_ready
qa_failed
```

Request:

```json
{
  "storyboard_id": "storyboard_...",
  "render_quality": "draft"
}
```

Response:

```json
{
  "task_run_id": "task_...",
  "job_id": "job_...",
  "status": "rendering_draft"
}
```

#### POST `/api/jobs/:id/publish`

Allowed states:

```txt
publish_ready
```

Request:

```json
{
  "draft_id": "draft_...",
  "provider": "youtube",
  "privacy_status": "private | unlisted",
  "title": "string",
  "description": "string"
}
```

Business rules:

- requires QA passed
- requires publish approval
- requires no blocking issues
- public publishing is out of MVP unless explicitly enabled

---

## 24. Async jobs y worker contract

Todo proceso largo corre como `task_run`.

Procesos largos:

- evidence collection
- story angle generation
- script generation
- claim verification
- production planning
- storyboard generation
- voice generation
- asset generation
- draft rendering
- QA
- publishing

### Estados de task_run

```txt
queued
running
succeeded
failed
cancelled
retrying
```

### Retry policy

```txt
provider 429:
- exponential backoff
- max 3 attempts

provider 5xx:
- retry 2 attempts

provider 4xx validation:
- no retry

schema validation failure:
- regenerate once
- then mark failed and require review

render crash:
- cleanup temp files
- retry once

privacy/rights block:
- no retry
- require user action
```

### Cancellation

- Jobs can be cancelled before render starts.
- Active provider calls are not forcibly killed unless provider supports cancellation.
- Cancelled tasks must not write partial artifacts as valid outputs.

### Heartbeat

Workers must update `heartbeat_at` for running tasks.

If heartbeat stale:

- mark task as failed or recoverable based on task type
- do not duplicate side effects without idempotency key

---

## 25. UI MVP

Pantallas necesarias:

1. Dashboard
2. Job Detail
3. Evidence Review
4. Story Angles
5. Script Candidates
6. Script Approval
7. Production Plan
8. Storyboard Preview
9. Draft Review
10. QA Report
11. Publish / Export
12. Provider Status
13. Audit Log

### 25.1 Dashboard

Debe mostrar:

- jobs recientes
- estado
- fecha
- próximo bloqueo
- botón crear job

### 25.2 Evidence Review

Debe mostrar:

- evidence items
- tipo
- preview
- rights status
- privacy status
- public safe
- source project
- warnings

Debe permitir:

- subir evidencia manual
- excluir evidencia
- marcar evidencia como no pública
- ejecutar privacy scan

### 25.3 Story Angles

Debe mostrar:

- 3 ángulos
- checklist narrativo
- evidencia relacionada
- risks/weaknesses
- score

Debe permitir:

- seleccionar ángulo
- regenerar
- rechazar

### 25.4 Script Approval UI

Debe permitir:

- ver 2–3 guiones
- ver claims por guion
- ver evidence mapping por claim
- ver warnings de lenguaje interno
- elegir uno
- pedir cambios
- rechazar
- aprobar

No debe permitir aprobación si:

- unsupported claims
- evidencia insegura
- schema inválido

### 25.5 Storyboard Preview UI

Debe mostrar:

- preview visual rápido
- contact sheet
- beat table
- asset plan
- rights warnings
- privacy warnings

Debe permitir:

- approve
- request revision

### 25.6 QA Report UI

Debe mostrar:

- scores 0–5
- blocking issues
- non-blocking issues
- pass/fail
- publish readiness

No debe mostrar solo “passed”. Debe mostrar por qué.

---

## 26. QA scoring contract

Cada draft recibe scores 0–5.

### 26.1 Dimensions

#### evidence_support

```txt
5: every factual claim maps to direct evidence
4: all claims supported; minor inferred language is safe
3: one weak claim needs approval/rewrite
2: multiple weak claims
1: unsupported claims exist
0: fabricated or misleading
```

#### rights_safety

```txt
5: all assets owned/licensed/generated/authorized with metadata
4: minor attribution warning, not blocking
3: one unclear asset
2: multiple unclear assets
1: prohibited asset risk
0: known unauthorized asset
```

#### privacy_safety

```txt
5: no PII/private data visible
4: minor low-risk internal detail
3: possible private detail needs review
2: visible sensitive detail
1: clear PII/internal secret risk
0: exposed secret/token/client confidential data
```

#### sme_clarity

```txt
5: non-technical founder gets value in under 5 seconds
4: clear after hook/context
3: understandable after full video
2: too abstract
1: mostly technical
0: incomprehensible to target audience
```

#### hook_strength

```txt
5: pain/result/curiosity in first 2 seconds
4: strong but slightly delayed
3: clear but generic
2: weak
1: confusing
0: absent
```

#### narrative_coherence

```txt
5: one clear story from problem to method to benefit
4: mostly clear
3: has multiple ideas but acceptable
2: scattered
1: contradictory
0: no story
```

#### visual_proof

```txt
5: real evidence appears early and supports story
4: real evidence appears but could be stronger
3: evidence appears late
2: mostly generic visuals
1: visuals do not support story
0: misleading visuals
```

#### caption_readability

```txt
5: readable on mobile, well paced
4: readable with minor density issues
3: acceptable but crowded
2: hard to read
1: mostly unreadable
0: missing captions
```

#### audio_quality

```txt
5: clear voice/music mix
4: minor mix issues
3: understandable but rough
2: distracting
1: hard to understand
0: missing/broken audio when required
```

#### pace

```txt
5: tight, no dead sections
4: minor slow section
3: acceptable
2: slow or rushed
1: hard to watch
0: broken pacing
```

### 26.2 Pass criteria

To pass QA:

```txt
evidence_support = 5
rights_safety = 5
privacy_safety = 5
no score below 4
no blocking issues
no prohibited public language
no unsupported claims
```

If any required score fails, status is `qa_failed`.

---

## 27. Eval suite

Before MVP acceptance, create at least 20 eval cases.

### 27.1 Required eval groups

```txt
5 strong evidence examples
5 weak evidence examples
5 technical/internal-language examples
5 unsupported-claim examples
```

### 27.2 Eval case format

```json
{
  "eval_id": "eval_001",
  "group": "strong_evidence",
  "input": {
    "evidence_items": [],
    "project_notes": [],
    "metrics": []
  },
  "expected": {
    "angle_should_pass": true,
    "script_should_pass": true,
    "unsupported_claims_allowed": false,
    "minimum_scores": {
      "evidence_support": 5,
      "sme_clarity": 4
    }
  }
}
```

### 27.3 Eval commands

Create commands:

```bash
pnpm eval:schemas
pnpm eval:story-miner
pnpm eval:scriptwriter
pnpm eval:claims
pnpm eval:qa
```

### 27.4 Required eval gates

CI should fail if:

- schemas fail
- unsupported claims pass
- internal language passes as public copy
- angle without visual evidence passes without warning
- privacy unsafe asset reaches storyboard

---

## 28. Security, privacy and rights

### 28.1 Secrets

- Never expose secrets in UI.
- Never expose secrets in logs.
- Never commit secrets.
- Never include secrets in model prompts.
- Redact keys/tokens before sending text to LLM.

### 28.2 PII redaction

Before public render, scan for:

- emails
- phone numbers
- addresses
- customer names
- invoices
- internal project URLs
- private repo names
- API keys
- access tokens
- auth headers
- credentials

### 28.3 Client/project privacy

Every project in Source Registry must have:

```txt
client_privacy_level: public | internal | confidential | restricted
```

Rules:

- `public`: can be used if rights are valid.
- `internal`: can be used only after privacy scan.
- `confidential`: requires explicit approval.
- `restricted`: cannot be used publicly.

### 28.4 Asset rights

Every external or generated asset must have:

- provider
- source URL or provider ID
- license/rights status
- attribution requirement
- created/downloaded timestamp

Rules:

- `unknown` cannot be used in final render.
- `prohibited` cannot be used at all.
- YouTube material requires explicit authorization or legitimate use basis documented.

### 28.5 Publishing

- No publish without QA passed.
- No publish without explicit publish approval.
- No public YouTube publishing in MVP unless enabled by config.
- Default YouTube upload privacy: `private`.

---

## 29. Observability and logging

Log structured events for:

- job created
- evidence collected
- source registry validation
- model call started/finished
- schema validation failed
- provider call started/finished
- provider error
- approval event
- state transition
- render started/finished
- QA failed/passed
- publish attempted

Each log should include:

```json
{
  "timestamp": "ISO-8601",
  "job_id": "string | null",
  "task_run_id": "string | null",
  "event": "string",
  "level": "info | warn | error",
  "metadata": {}
}
```

Do not log:

- API keys
- OAuth tokens
- full private prompts containing secrets
- raw private screenshots in text logs

---

## 30. Testing and CI

### Required scripts

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "db:migrate": "node scripts/migrate.js",
    "smoke": "bash scripts/smoke.sh"
  }
}
```

Python service:

```bash
pytest
ruff check .
mypy .
```

### Minimum tests

#### Unit tests

- state transitions
- schema validation
- claim support validation
- rights validation
- privacy blocking
- API request validation

#### Integration tests

- create job → add evidence → generate angles mock
- angles → scripts → claim verification
- script approval blocks unsupported claim
- production plan blocked before script approval
- render blocked before storyboard
- publish blocked before QA

#### E2E smoke

- create job
- upload evidence
- generate mock angles
- generate mock scripts
- approve script
- create storyboard
- render mock draft
- run QA

---

## 31. Implementation order por vertical slices

### VS0 — Repo, tooling, DB, state machine

Deliverables:

- repo creado
- monorepo o workspace funcional
- Next.js app
- SQLite
- migrations
- state machine
- basic dashboard
- health endpoint

Acceptance:

- app corre local
- DB migra
- job can be created
- invalid state transitions fail
- tests pass

### VS1 — Evidence intake and Source Registry

Deliverables:

- `content-engine-v2-source-map.md` contract
- validate source registry
- manual evidence upload
- evidence DB rows
- rights/privacy fields
- Evidence Review UI

Acceptance:

- evidence can be added
- unsafe evidence blocks public use
- registry snapshot saved

### VS2 — Story Miner with strict schema

Deliverables:

- CrewAI Story Miner
- mock model option
- structured output validation
- 3 story angles
- narrative checklist
- Story Angles UI

Acceptance:

- exactly 3 angles
- invalid angles rejected
- angle without visual evidence flagged

### VS3 — Scriptwriter + Claim Verifier

Deliverables:

- Scriptwriter
- Claim Verifier
- script schemas
- claim-evidence links
- Script Candidates UI

Acceptance:

- 2–3 scripts generated
- unsupported claims blocked
- internal language flagged
- claims visible in UI

### VS4 — Gate A Script Approval

Deliverables:

- approval API
- approval DB rows
- server-side gate enforcement
- UI approve/reject/request revision

Acceptance:

- production plan cannot run before approval
- approval creates audit log
- rejected scripts cannot render

### VS5 — Production Plan and Storyboard Preview

Deliverables:

- Video Producer
- production plan schema
- storyboard schema
- contact sheet placeholder
- Storyboard Preview UI

Acceptance:

- every scene references asset/evidence
- unsafe rights blocked
- factual beats require evidence

### VS6 — Draft Renderer

Deliverables:

- Remotion fresh setup
- ffmpeg integration
- render draft
- timeline JSON
- contact sheet

Acceptance:

- draft mp4 exists
- captions present
- render task logged
- render blocked without storyboard

### VS7 — QA / Publish Readiness

Deliverables:

- QA scoring engine
- QA Report UI
- blocking/non-blocking issues
- Gate B enforcement

Acceptance:

- QA fails bad draft
- QA passes valid draft
- publish blocked before QA pass

### VS8 — Export / optional YouTube private upload

Deliverables:

- export final
- publish approval
- optional YouTube private upload
- publish events

Acceptance:

- final export only after QA
- YouTube upload defaults private
- publish event logged

### VS9 — Real providers Tier 1

Deliverables:

- Pexels real
- ElevenLabs real
- local music/SFX
- provider status UI
- provider events/cost logging

Acceptance:

- providers fail gracefully
- missing API keys show `not_configured`
- provider calls logged

---

## 32. Milestones

### M1 — Scaffold limpio

- repo nuevo
- Next.js app
- CrewAI service
- SQLite
- schemas
- job model
- provider registry
- state machine

### M2 — Evidence Core

- source registry
- manual upload
- evidence validation
- privacy/rights flags

### M3 — Story Miner / Strategist

- evidence input
- generación de 3 ángulos
- JSON schema estricto
- UI para revisar ángulos
- checklist narrativo obligatorio

### M4 — Audience Scriptwriter + Claim Verifier

- 2–3 scripts
- hook + beats
- claims
- evidence mapping
- internal language check

### M5 — Gate A

- approval gate
- UI para aprobar/rechazar
- bloqueo real de producción

### M6 — Video Producer

- production plan
- asset plan
- screenshot/demo capture plan
- avatar/voice plan
- captions plan

### M7 — Editor / Motion Assembler

- timeline
- storyboard preview
- contact sheet
- draft renderer

### M8 — QA / Publish Readiness

- claims check
- internal language check
- evidence visibility check
- visual/audio legibility
- SME clarity check
- rights/privacy check

### M9 — Providers reales

- Pexels
- ElevenLabs
- local music/SFX
- WaveSpeed post-MVP
- HeyGen post-MVP
- YouTube post-MVP

### M10 — Export/publicación

- export final
- optional YouTube private upload
- feedback webhook post-MVP

---

## 33. Definition of Done MVP

El MVP está listo cuando:

- toma evidencia diaria desde proyectos reales o uploads manuales
- valida Source Registry
- guarda evidencia con rights/privacy metadata
- genera exactamente 3 ángulos narrativos
- cada ángulo sigue el marco “hice esto con IA para lograr X usando un método impresionante y obtuve beneficios concretos”
- genera 2–3 guiones buenos para pymes
- mapea todos los claims factuales a evidencia
- bloquea claims unsupported
- bloquea producción hasta aprobación de Adrian/owner
- arma plan visual desde el guion elegido
- genera storyboard preview
- produce draft mp4 local
- genera contact sheet
- pasa QA narrativo/visual/derechos/privacidad
- exporta final solo si QA pasa
- publica solo si hay aprobación explícita
- registra provider events
- registra audit log
- tiene tests para state machine, schemas, gates y claim blocking

---

## 34. Definition of Done por artifact

### EvidenceItem listo

- existe en DB
- tiene tipo válido
- tiene rights status
- tiene privacy level
- tiene public_safe
- tiene path/url válido

### StoryAngle listo

- schema válido
- checklist completo
- visual evidence ids
- benefits for SMEs
- risk_or_weakness

### Script listo

- schema válido
- 20–75 segundos
- hook claro
- beats con evidencia cuando aplica
- claims listados
- no lenguaje interno prohibido

### Script aprobado

- owner approval row
- no unsupported claims
- weak claims resueltos
- state `script_approved`

### Storyboard listo

- timeline válido
- escenas con assets/evidence
- captions
- estimated duration
- no assets prohibidos

### Draft listo

- mp4 existe
- timeline json existe
- contact sheet existe
- duration detectada
- render event logged

### QA passed

- required scores cumplidos
- no blocking issues
- publish_ready true o export_ready true

---

## 35. Riesgos principales y mitigaciones

### Riesgo: contenido genérico

Mitigación:

- evidencia real primero
- visual proof score
- stock bloqueado como evidencia factual

### Riesgo: claims falsos

Mitigación:

- script_claims
- claim_evidence_links
- Claim Verifier
- QA evidence_support must equal 5

### Riesgo: scope creep de providers

Mitigación:

- provider tiers
- mocks primero
- Tier 2/3 bloqueado hasta pipeline base

### Riesgo: fuga de información privada

Mitigación:

- privacy scan
- privacy_level per project
- public_safe flag
- restricted blocks render

### Riesgo: app visualmente funcional pero narrativamente mala

Mitigación:

- golden examples
- narrative checklist
- SME clarity score
- hook score
- QA pass threshold

### Riesgo: agent construye horizontalmente y deja todo incompleto

Mitigación:

- vertical slices obligatorios
- acceptance criteria por slice
- tests por slice

---

## 36. README esperado

El README debe incluir:

```md
# Content Engine v2

## Qué es

App para convertir evidencia real del trabajo de M8 Apps en shorts sociales verificables.

## Principio central

Evidencia real primero. Claims verificables. Narrativa para pymes.

## Setup

1. cp .env.example .env.local
2. pnpm install
3. pnpm db:migrate
4. pnpm dev
5. python -m venv .venv
6. pip install -r services/crew/requirements.txt
7. python services/crew/main.py

## Scripts

- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm smoke

## MVP flow

create job → evidence → angles → scripts → approval → production plan → storyboard → draft → QA → export

## Safety

No publish without QA and explicit approval.
```

---

## 37. Instrucción final al agente

Construye Content Engine v2 como un sistema de producción pequeño, estricto y verificable.

No optimices para demos bonitas.

Optimiza para:

- evidencia real
- claims verificables
- buenos guiones
- gates duros
- schemas estrictos
- estados claros
- seguridad
- privacidad
- derechos
- tests
- vertical slices terminados

La prioridad absoluta es:

```txt
calidad narrativa verificable > automatización > providers avanzados > publicación
```

Si el guion es malo, todo lo demás solo amplifica basura.

