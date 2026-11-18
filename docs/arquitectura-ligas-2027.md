# TTRAIL 2027 — contrato funcional y plan de integración

## Estado
Rama `feature/supabase-ligas-2027`. No fusionar con `main` hasta completar autenticación, persistencia, RLS, pruebas y migración. La UI actual contiene vistas de demostración y datos históricos en localStorage; **no** constituye todavía una aplicación multiusuario operativa.

## Decisiones confirmadas
- Identidad única de socio mediante Supabase Auth, acceso por email y código OTP.
- Retos: publicación automática el primer día de cada mes (zona Europe/Madrid), con nombre, descripción y reglas de futuros retos inaccesibles a usuarios no administradores **desde base de datos**, no solo ocultos con CSS.
- Clasificaciones: únicamente resultados aprobados; categorías de retos por sexo y talla (XS/S frente a M), con categoría de temporada fijada.
- Liga T-Center: inscripción individual mediante atributo del atleta; quien no participa no puede enviar actividades.
- Asistencias T-TRAIL lunes y miércoles: 2 puntos por sesión; T-Run martes y jueves: 1 punto por sesión. El atleta y el entrenador pueden registrar; unicidad por atleta, tipo y fecha de clase.
- Track: máximo un track puntuable por semana (lunes-domingo), con >=10 km **o** >=500 m positivos **en la misma actividad**: 3 puntos. Evidencia de enlace, captura o GPX/FIT/TCX.
- ST: 4 puntos; AE: 5 puntos; IBKT: 5 puntos; OP: 5 puntos. Carreras puntuables solo si están en el calendario oficial. Reserva de salida no equivale automáticamente a asistencia.
- El atleta registra actividades de lunes a domingo hasta el lunes siguiente 23:59 Europe/Madrid, inclusive. Validación posterior permitida; llegada tardía no puntuable.
- Mes de puntos = mes de fecha de actividad, aunque se registre o valide el mes siguiente.
- Premios mensuales: máxima puntuación del mes; anuales: tres mayores acumulados; empates mediante sorteo registrado.

## Modelo de datos propuesto (pendiente de inspeccionar el esquema existente)
Reutilizar identidad `auth.users`, sin crear cuentas paralelas. Crear tablas TTRAIL bajo esquema propio si resulta compatible:
- `athletes`: auth_user_id, nombre, sexo, talla_temporada, liga_presencial_activa, estado.
- `roles`: auth_user_id, rol (admin, joan, entrenador), sin basarse en user_metadata.
- `challenges`: temporada, mes, publicación, métrica, reglas, estado.
- `challenge_submissions`: atleta, reto, marca estructurada, evidencia, estado, validación, origen.
- `tc_events`: fecha, tipo, referencia a calendario oficial, ubicación.
- `tc_submissions`: atleta, fecha_actividad, tipo, evento, distancia/desnivel, evidencia, estado, origen, autor, validación.
- `tc_event_calendar`: carreras y salidas autorizadas, categoría y fechas.
- `audit_log`: actor, operación, fecha, cambios.
- `evidence`: bucket privado, objeto, propietario, vínculo a registro.

## Seguridad e integridad
- RLS en todas las tablas expuestas, acceso limitado al propietario o roles autorizados.
- Ninguna clave secreta o service_role en GitHub Pages; solo clave pública de Supabase.
- Reglas de fecha límite, puntuación y duplicados en el servidor (SQL/funciones seguras), nunca exclusivamente en JavaScript.
- Archivos en Storage privado con políticas de acceso y límites de tipo/tamaño.
- Separar permisos de Joan (T-Center) de los del administrador global; acceso de entrenador restringido a asistencias.
- Impedir que el atleta apruebe su propia actividad o manipule puntos.
- Evitar enumeración de usuarios; vincular cuentas existentes con proceso de invitación o alta autorizada.

## Pendientes bloqueantes
1. El proyecto `ttrail-training-dev` se está reactivando; inspeccionar tablas y políticas existentes antes de migrar.
2. Configurar email OTP **de seis dígitos** en plantilla de Supabase (por defecto puede enviar magic link), URL de GitHub Pages y SMTP adecuado para socios.
3. Confirmar cuentas de administrador y Joan mediante procedimiento seguro; no inventar direcciones.
4. Concretar fórmula de participación y puntos de Liga Retos 2027; no aplicar una fórmula no aprobada.
5. Cargar catálogo oficial de retos y calendario de carreras/salidas.
6. Integración de reservas web y procesamiento de GPX/FIT/TCX requieren contrato de datos y pruebas.
7. Migrar histórico 2026, reconciliar nombres/identidades y conservar posiciones oficiales.
