# Rust in Production: 5 Real-World Use Cases (2025)

Rust has matured significantly as a production language. Its combination of memory safety without garbage collection, zero-cost abstractions, and a rich ecosystem (via crates.io) has made it a practical choice across a wide range of domains. The following five use cases reflect how teams are deploying Rust in production systems today.

---

## 1. High-Performance CLI Tools

### Description

Rust has become the go-to language for building CLI tools that need to be fast, portable, and self-contained. Tools like `ripgrep`, `fd`, `bat`, `zoxide`, and `starship` have demonstrated that Rust can produce binaries that outperform their C or Python counterparts while shipping with no runtime dependency. In 2025, organizations are building internal DevOps tooling, data pipeline CLIs, and developer productivity tools in Rust using crates like `clap`, `indicatif`, `console`, and `serde`.

### Code Snippet

```rust
use clap::{Arg, Command};
use std::fs;
use std::path::PathBuf;

fn main() {
    let matches = Command::new("filecount")
        .version("1.0")
        .about("Counts files in a directory by extension")
        .arg(
            Arg::new("path")
                .help("Directory to scan")
                .required(true)
                .index(1),
        )
        .arg(
            Arg::new("ext")
                .short('e')
                .long("ext")
                .help("Filter by file extension (e.g. rs, ts, go)"),
        )
        .get_matches();

    let path = PathBuf::from(matches.get_one::<String>("path").unwrap());
    let ext_filter = matches.get_one::<String>("ext").map(|s| s.as_str());

    let count = fs::read_dir(&path)
        .expect("Failed to read directory")
        .filter_map(|e| e.ok())
        .filter(|e| {
            let name = e.file_name();
            let name_str = name.to_string_lossy();
            match ext_filter {
                Some(ext) => name_str.ends_with(&format!(".{ext}")),
                None => true,
            }
        })
        .count();

    println!("Found {count} file(s) in {}", path.display());
}
```

### Pros

- Single static binary with no runtime — trivial to distribute and install via package managers or direct download.
- Compilation catches bugs early; `clap` derives argument parsing at compile time, eliminating entire classes of runtime errors.
- Startup time is near-instant compared to Python or JVM-based CLIs.
- Cross-compilation to Linux, macOS, and Windows from a single CI pipeline is well-supported via `cross` or native GitHub Actions targets.
- First-class support for shell completions, colored output, and progress bars via mature crates.

### Cons

- Longer initial development time compared to scripting in Python or Go for simple one-off tools.
- Compile times can be significant in large projects, slowing iteration speed during development.
- Learning curve for developers unfamiliar with ownership and lifetimes, especially for error handling with `?` and `thiserror`/`anyhow`.
- Binary size, while small by default, can grow with dependencies unless carefully managed with `strip` and LTO flags.
- Ecosystem fragmentation: multiple competing crates for similar tasks (e.g., `clap` vs `argh` vs `pico-args`) can slow architectural decisions.

---

## 2. WebAssembly Modules for the Browser and Edge

### Description

Rust is the premier language for compiling to WebAssembly (Wasm). The `wasm-pack` and `wasm-bindgen` toolchain allows Rust code to be called directly from JavaScript in the browser or deployed to edge runtimes like Cloudflare Workers, Fastly Compute, and WasmEdge. Production use cases include image/video processing, cryptographic operations, parsers, and game engines — any computation-heavy task that benefits from near-native performance in a sandboxed environment.

### Code Snippet

```rust
use wasm_bindgen::prelude::*;

/// Compresses a string using a simple run-length encoding scheme.
/// Exported to JavaScript as `compress_rle`.
#[wasm_bindgen]
pub fn compress_rle(input: &str) -> String {
    let chars: Vec<char> = input.chars().collect();
    let mut output = String::new();
    let mut i = 0;

    while i < chars.len() {
        let current = chars[i];
        let mut count = 1usize;

        while i + count < chars.len() && chars[i + count] == current {
            count += 1;
        }

        if count > 1 {
            output.push_str(&count.to_string());
        }
        output.push(current);
        i += count;
    }

    output
}

#[wasm_bindgen]
pub fn wasm_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
```

```javascript
// Calling from JavaScript after `wasm-pack build --target web`
import init, { compress_rle } from "./pkg/mylib.js";

await init();
console.log(compress_rle("aaabbbcccc")); // "3a3b4c"
```

### Pros

- Near-native execution speed in the browser sandbox — significantly faster than equivalent JavaScript for CPU-bound tasks.
- Strong memory safety guarantees carry into the Wasm sandbox, reducing the risk of memory-corruption exploits in compiled modules.
- `wasm-bindgen` generates TypeScript type definitions automatically, giving consumers a typed API at no extra effort.
- Wasm modules are portable across all major runtimes: browsers, Node.js, Deno, Bun, and edge platforms without code changes.
- The Wasm component model (WASI 0.2, stabilized in 2024) enables language-agnostic composition of Rust modules with other Wasm components.

### Cons

- Wasm binary size requires careful management: unused code must be stripped with `wasm-opt` and `wasm-snip` to keep bundle sizes reasonable.
- Interoperability between Rust/Wasm and JavaScript involves serialization overhead; complex data types require `serde-wasm-bindgen` or manual bridging.
- Debugging Wasm in the browser is improving but still less ergonomic than native debugging — source maps and DWARF support vary by browser.
- Multithreading in Wasm (via `SharedArrayBuffer`) requires specific HTTP headers and browser support, limiting parallel workloads.
- The Wasm component model tooling (e.g., `wit-bindgen`, `wasmtime`) is still maturing and documentation lags behind the spec.

---

## 3. Async Networking Services and HTTP APIs

### Description

Rust's `tokio` async runtime and frameworks like `axum` and `actix-web` are used in production to build HTTP APIs, gRPC services, and TCP proxies that must sustain high connection counts with predictable latency. Companies including Discord, Cloudflare, and AWS have published case studies on replacing bottleneck services with Rust to cut memory usage by an order of magnitude and eliminate GC pause spikes. In 2025, `axum` (maintained by the Tokio team) is the most common choice for new Rust HTTP services.

### Code Snippet

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use std::collections::HashMap;

#[derive(Clone, Serialize, Deserialize)]
struct Item {
    id: u32,
    name: String,
}

type Store = Arc<RwLock<HashMap<u32, Item>>>;

async fn get_item(
    Path(id): Path<u32>,
    State(store): State<Store>,
) -> Result<Json<Item>, StatusCode> {
    let store = store.read().unwrap();
    store.get(&id).cloned().map(Json).ok_or(StatusCode::NOT_FOUND)
}

async fn create_item(
    State(store): State<Store>,
    Json(item): Json<Item>,
) -> (StatusCode, Json<Item>) {
    store.write().unwrap().insert(item.id, item.clone());
    (StatusCode::CREATED, Json(item))
}

#[tokio::main]
async fn main() {
    let store: Store = Arc::new(RwLock::new(HashMap::new()));
    let app = Router::new()
        .route("/items/{id}", get(get_item))
        .route("/items", post(create_item))
        .with_state(store);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### Pros

- Extremely low memory footprint per connection compared to thread-per-request models; practical to sustain hundreds of thousands of concurrent connections.
- No garbage collector means latency is consistent and predictable — no stop-the-world pauses affecting tail latencies (p99/p999).
- `axum`'s type-driven extractors catch handler signature mismatches at compile time, preventing a class of runtime 500 errors.
- `tower` middleware ecosystem provides composable layers for auth, rate limiting, tracing, and timeouts that work across axum and tonic (gRPC).
- First-class `tracing` crate integration enables structured, async-aware logging and distributed tracing (OpenTelemetry) out of the box.

### Cons

- Async Rust has a steeper learning curve than async in Go or Node.js; pinning, `Send` bounds, and async trait objects trip up new contributors.
- Ecosystem is less opinionated than frameworks like Django or Rails; teams must assemble their own stack (ORM, migrations, validation), which increases setup time.
- Compile times for large async services can be slow, particularly on first build, impeding developer feedback cycles without incremental compilation tuning.
- Error handling in async contexts requires careful use of `anyhow` or `thiserror`; poorly structured errors lead to opaque logs in production.
- Database ecosystem maturity is improving but `sqlx` (compile-time-checked queries) requires a running database at compile time, complicating CI pipelines.

---

## 4. Embedded Systems and Firmware

### Description

Rust has gained serious traction in embedded development, particularly for microcontrollers (Cortex-M, RISC-V, ESP32) where C has historically dominated. The `embedded-hal` abstraction layer, `probe-rs` debugger, and the `Embassy` async embedded framework enable safe, interrupt-driven firmware without an RTOS. In 2025, companies developing IoT sensors, industrial controllers, and safety-critical automotive components are adopting Rust to eliminate undefined behavior that plagues C firmware. The Linux kernel now accepts Rust modules, and efforts like Ferrocene (a qualified Rust toolchain for ISO 26262) are accelerating adoption in safety-critical domains.

### Code Snippet

```rust
// Embassy-based async firmware for an STM32 microcontroller
// Blinks an LED and reads a button using async tasks
#![no_std]
#![no_main]

use embassy_executor::Spawner;
use embassy_stm32::gpio::{Input, Level, Output, Pull, Speed};
use embassy_time::{Duration, Timer};
use {defmt_rtt as _, panic_probe as _};

#[embassy_executor::task]
async fn blink_task(mut led: Output<'static>) {
    loop {
        led.set_high();
        Timer::after(Duration::from_millis(500)).await;
        led.set_low();
        Timer::after(Duration::from_millis(500)).await;
    }
}

#[embassy_executor::main]
async fn main(spawner: Spawner) {
    let p = embassy_stm32::init(Default::default());

    let led = Output::new(p.PC13, Level::High, Speed::Low);
    let button = Input::new(p.PA0, Pull::Down);

    spawner.spawn(blink_task(led)).unwrap();

    loop {
        // Wait for button press, then log via RTT
        if button.is_high() {
            defmt::info!("Button pressed!");
        }
        Timer::after(Duration::from_millis(50)).await;
    }
}
```

### Pros

- Memory safety guarantees eliminate buffer overflows, use-after-free, and null pointer dereferences — the dominant bug categories in embedded C.
- `no_std` support means Rust can target bare-metal environments with no operating system and as little as a few kilobytes of flash.
- `Embassy`'s cooperative async model allows efficient multitasking on single-core MCUs without the overhead or complexity of a traditional RTOS.
- Strong type system encodes hardware state (e.g., pin modes, peripheral ownership) at compile time, preventing misuse of peripherals across tasks.
- `defmt` provides efficient, structured logging over RTT/SWD that has near-zero overhead on resource-constrained targets.

### Cons

- `no_std` ecosystem is smaller than the C/C++ embedded ecosystem; not all peripheral drivers or protocol stacks have mature Rust crates yet.
- Toolchain setup (target triple installation, linker scripts, `probe-rs`, OpenOCD) is more complex than a standard Arduino or C IDE workflow.
- `Embassy`'s async model requires understanding async Rust, which is an additional layer of complexity on top of already-challenging embedded development.
- Compile times are noticeably slower than C, which matters in tightly iterative embedded debug cycles.
- Hiring developers with both Rust and embedded experience remains difficult; the intersection of the two skillsets is a small talent pool.

---

## 5. Systems Software and Infrastructure Tooling

### Description

Rust is increasingly used to build foundational infrastructure: container runtimes, database engines, storage systems, and language toolchains. Projects like `firecracker` (AWS), `TiKV` (PingCAP), `Databend`, `InfluxDB IOx`, `Turbopack` (Vercel), and the Deno runtime are production Rust systems managing petabytes of data or serving millions of requests. The combination of C-level performance, safe concurrency, and a modern package manager makes Rust compelling for greenfield infrastructure where correctness and performance both matter.

### Code Snippet

```rust
// Simplified write-ahead log (WAL) segment writer
// Demonstrates use of memory-mapped I/O and checksumming
use std::fs::{File, OpenOptions};
use std::io::{self, Write};
use std::path::Path;

const MAGIC: u32 = 0xDEAD_BEEF;

#[repr(C)]
struct LogEntry {
    magic: u32,
    sequence: u64,
    length: u32,
    checksum: u32,
}

fn checksum(data: &[u8]) -> u32 {
    data.iter().fold(0u32, |acc, &b| acc.wrapping_add(b as u32))
}

fn append_entry(file: &mut File, sequence: u64, payload: &[u8]) -> io::Result<()> {
    let cs = checksum(payload);
    let header = LogEntry {
        magic: MAGIC,
        sequence,
        length: payload.len() as u32,
        checksum: cs,
    };
    // SAFETY: LogEntry is repr(C) with no padding on this platform
    let header_bytes = unsafe {
        std::slice::from_raw_parts(
            &header as *const LogEntry as *const u8,
            std::mem::size_of::<LogEntry>(),
        )
    };
    file.write_all(header_bytes)?;
    file.write_all(payload)?;
    file.flush()
}

fn open_wal(path: &Path) -> io::Result<File> {
    OpenOptions::new().create(true).append(true).open(path)
}
```

### Pros

- Performance is on par with C/C++ while eliminating data races at the language level — critical for concurrent storage engines and runtimes.
- Rust's ownership model maps naturally to resource management problems (file descriptors, memory regions, locks) common in systems software.
- `unsafe` is explicit and localized: it forces engineers to document and audit the exact boundaries where safety invariants are manually upheld.
- Rich concurrency primitives (`Arc`, `Mutex`, `RwLock`, channels, `rayon` for data parallelism) compose safely without the risk of silent data corruption.
- Strong `cargo` tooling (workspaces, feature flags, `cargo-audit` for CVE scanning) makes large multi-crate infrastructure projects manageable.

### Cons

- Systems programming in Rust still requires careful use of `unsafe` for interop with OS APIs, hardware, or FFI, which demands expert review.
- Lifetimes and borrow checking add cognitive overhead when designing data structures with complex ownership topologies (e.g., graphs, arenas).
- Longer time-to-first-prototype compared to Go for infrastructure services; Rust's type system frontloads design decisions.
- FFI with C libraries (e.g., RocksDB, zlib) requires `bindgen` and careful lifetime management across the boundary, increasing maintenance burden.
- Async and synchronous code do not compose freely — mixing blocking calls inside async runtimes causes hard-to-diagnose thread starvation without discipline around `spawn_blocking`.

---

## Summary

| Use Case | Maturity | Key Crates | Best Fit For |
|---|---|---|---|
| CLI Tools | Production-stable | `clap`, `indicatif`, `anyhow` | Dev tooling, data pipelines |
| WebAssembly | Production-stable | `wasm-bindgen`, `wasm-pack`, `wasmtime` | Browser compute, edge functions |
| Async HTTP Services | Production-stable | `tokio`, `axum`, `tower`, `sqlx` | High-throughput APIs, proxies |
| Embedded / Firmware | Growing adoption | `embassy`, `embedded-hal`, `defmt` | IoT, industrial, safety-critical |
| Systems Infrastructure | Production-stable | `tokio`, `rayon`, `serde`, `mmap` | Databases, runtimes, storage |

Rust's position in 2025 is that of a pragmatic systems language with a mature ecosystem. Its upfront learning investment is real, but teams consistently report that production Rust codebases require fewer runtime hotfixes, scale predictably under load, and are easier to reason about under concurrent workloads than equivalent C++ or Go services.
