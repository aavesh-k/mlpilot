export default function DatasetUpload() {
  return (
    <div className="p-8 lg:p-12 max-w-4xl">
      <section className="mb-12">
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none mb-4 tracking-tighter">
          Dataset <span className="text-secondary">Upload</span>
        </h1>
        <p className="text-xl text-on-surface-variant font-medium">Ingest your data. CSV, Parquet, or JSON.</p>
      </section>

      <div className="bg-white border-2 border-primary p-8 neo-shadow mb-8">
        <div className="border-2 border-dashed border-primary p-12 text-center hover:bg-surface-container-low transition-colors cursor-pointer group">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant group-hover:text-primary transition-colors">cloud_upload</span>
          <p className="font-headline font-black text-xl uppercase mt-4">Drop Files Here</p>
          <p className="text-on-surface-variant text-sm font-medium mt-2">or click to browse — Max 5GB</p>
        </div>
      </div>

      <div className="bg-white border-2 border-primary p-8 neo-shadow">
        <h3 className="font-headline font-black text-xl uppercase mb-6">Recent Uploads</h3>
        {[
          { name: "training_data_v3.csv", size: "1.2 GB", status: "Processed", color: "bg-tertiary" },
          { name: "test_samples.parquet", size: "450 MB", status: "Processing", color: "bg-primary-container" },
        ].map((file) => (
          <div key={file.name} className="flex items-center justify-between py-4 border-b-2 border-primary last:border-b-0">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-2xl">description</span>
              <div>
                <p className="font-headline font-bold">{file.name}</p>
                <p className="text-xs text-on-surface-variant">{file.size}</p>
              </div>
            </div>
            <span className={`${file.color} text-primary text-xs font-headline font-bold uppercase px-3 py-1 border-2 border-primary`}>
              {file.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
