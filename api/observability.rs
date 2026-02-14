use opentelemetry::global;
use opentelemetry_sdk::trace::TracerProvider;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn init_observability() -> Result<(), Box<dyn std::error::Error>> {
    let provider = TracerProvider::builder().build();
    global::set_tracer_provider(provider);

    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer().json())
        .try_init()?;

    Ok(())
}
