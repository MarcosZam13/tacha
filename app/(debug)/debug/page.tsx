import type { JSX } from "react";

export const metadata = {
  title: "Panel de Debug",
  description: "Herramientas de desarrollo y testing del pipeline de scraping",
};

export default function DebugPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔧 Panel de Debug — Tacha Pipeline
          </h1>
          <p className="text-gray-700">
            Herramientas de desarrollo para testear el pipeline de scraping + catálogo
          </p>
        </div>

        {/* Grid de features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spec 1: Demo Scraping */}
          <a
            href="/debug/scraping-demo"
            className="group block p-6 bg-white rounded-lg shadow hover:shadow-lg transition border-l-4 border-blue-500"
          >
            <div className="mb-2">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                Spec 1
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
              📦 Demo: Ingesta Scraping
            </h2>
            <p className="text-gray-700 mb-4">
              Prueba el comportamiento cache-first del scraping. Busca un producto y ve cómo la primera búsqueda es en vivo y la segunda desde cache.
            </p>
            <div className="text-sm text-gray-600">
              <p>✅ Formulario de búsqueda</p>
              <p>✅ Indicador visual de cache</p>
              <p>✅ Tabla de staging</p>
            </div>
          </a>

          {/* Spec 2: Búsqueda Catálogo */}
          <a
            href="/debug/search-demo"
            className="group block p-6 bg-white rounded-lg shadow hover:shadow-lg transition border-l-4 border-green-500"
          >
            <div className="mb-2">
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                Spec 2
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition">
              🔍 Búsqueda: Catálogo Normalizado
            </h2>
            <p className="text-gray-700 mb-4">
              Busca en el catálogo normalizado. Ve productos, variantes, marcas y rango de precios por tienda.
            </p>
            <div className="text-sm text-gray-600">
              <p>✅ Búsqueda por similitud</p>
              <p>✅ Variantes y marcas</p>
              <p>✅ Rango de precios por tienda</p>
            </div>
          </a>

          {/* Spec 3: Normalización */}
          <a
            href="/debug/normalize-demo"
            className="group block p-6 bg-white rounded-lg shadow hover:shadow-lg transition border-l-4 border-purple-500"
          >
            <div className="mb-2">
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                Spec 3
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition">
              ⚙️ Normalización: Staging → Catálogo
            </h2>
            <p className="text-gray-700 mb-4">
              Procesa filas de staging y conviértelas en catálogo normalizado. Parsea tamaños, crea variantes y precios.
            </p>
            <div className="text-sm text-gray-600">
              <p>✅ Procesar lote de filas</p>
              <p>✅ Ver matched/rejected</p>
              <p>✅ Verificar productos creados</p>
            </div>
          </a>

          {/* Spec 4: Preferencias */}
          <a
            href="/debug/preferences-demo"
            className="group block p-6 bg-white rounded-lg shadow hover:shadow-lg transition border-l-4 border-orange-500"
          >
            <div className="mb-2">
              <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">
                Spec 4
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition">
              🏪 Preferencias: Tiendas por Household
            </h2>
            <p className="text-gray-700 mb-4">
              Configura qué tiendas quieres ver. Los toggles actualizan automáticamente y filtran el catálogo.
            </p>
            <div className="text-sm text-gray-600">
              <p>✅ Toggle de tiendas</p>
              <p>✅ Lectura/escritura en BD</p>
              <p>✅ Filtro automático de precios</p>
            </div>
          </a>
        </div>

        {/* Info adicional */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Guía de Testing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <p className="font-semibold text-gray-900 mb-2">Orden recomendado:</p>
              <ol className="space-y-1">
                <li>1️⃣ <strong>Spec 1</strong> — Inserta datos en staging</li>
                <li>2️⃣ <strong>Spec 3</strong> — Normaliza staging → catálogo</li>
                <li>3️⃣ <strong>Spec 2</strong> — Busca en catálogo normalizado</li>
                <li>4️⃣ <strong>Spec 4</strong> — Filtra por preferencias</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Qué probar:</p>
              <ul className="space-y-1">
                <li>✅ Busca &quot;leche&quot; → live, luego cache</li>
                <li>✅ Normaliza → ve productos creados</li>
                <li>✅ Busca &quot;leche&quot; en catálogo normalizado</li>
                <li>✅ Oculta Walmart → rango cambia</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Documentación */}
        <div className="mt-8 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
          <h3 className="text-lg font-bold text-indigo-900 mb-2">📖 Documentación</h3>
          <p className="text-indigo-800 mb-4">
            Para detalles técnicos, ver estos archivos en la raíz del proyecto:
          </p>
          <ul className="text-sm text-indigo-700 space-y-1">
            <li>
              <code className="bg-white px-2 py-1 rounded">IMPLEMENTATION-REPORT-SPECS-01-04.md</code> — Panorama completo
            </li>
            <li>
              <code className="bg-white px-2 py-1 rounded">QUICK-VALIDATION-CHECKLIST.md</code> — Validación rápida
            </li>
            <li>
              <code className="bg-white px-2 py-1 rounded">SPEC-0X-IMPLEMENTATION.md</code> — Detalles por spec
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
