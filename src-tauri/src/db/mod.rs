pub mod write_job;
pub mod write_worker;

use std::sync::Arc;
use async_channel::Sender;

pub use write_job::WriteJob;
pub use write_worker::WriteWorker;

// 書き込みキュー状態
#[derive(Clone)]
pub struct WriteQueueState {
    pub tx: Arc<Sender<WriteJob>>,
}
