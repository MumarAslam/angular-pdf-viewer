import { Component, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
let PDFJS = window['pdfjs-dist/build/pdf'];
PDFJS.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { IPageInfo } from 'ngx-virtual-scroller';
import { VirtualScrollerComponent } from 'ngx-virtual-scroller';
import { NgxSpinnerService } from "ngx-spinner";

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.css'],
})

export class ViewerComponent implements OnInit {

  imagesArray: any = [];
  items = [];
  isLoaded: boolean;
  fileName: string = '';
  typeSelected: string = 'ball-scale-multiple'
  number: number;
  itemSize: number = 170;
  pageSize = 1;
  protected buffer: any[] = [];
  protected loading: boolean;
  @Output() onFileUpload: EventEmitter<any> = new EventEmitter();
  fetchedRanges = new Set<number>();
  @ViewChild(CdkVirtualScrollViewport) virtualScroll: CdkVirtualScrollViewport;
  @ViewChild(VirtualScrollerComponent) virtualScrollNfx: VirtualScrollerComponent;

  constructor(private spinner: NgxSpinnerService) { }
  ngOnInit(): void { }

  readFileData = (file: any) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        resolve(e.target.result);
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  };

  convertPdfToImages = async (file: any) => {
    const images = [];
    const data = await this.readFileData(file);
    const pdf = await PDFJS.getDocument(data).promise;
    const canvas = document.createElement("canvas");
    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1);
      const viewport = page.getViewport({ scale: 1 });
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      const url = await canvas.toDataURL()
      images.push({ image: url, index: i + 1 })
    }
    canvas.remove();
    return images;
  }

  async onFileSelected(event: any) {
    this.isLoaded = false
    this.imagesArray = []
    this.items = []
    const file: File = event.target.files[0]
    this.fetchedRanges.clear()
    if (file) {
      this.spinner.show()
      this.fileName = file.name;
      this.imagesArray = await this.convertPdfToImages(file)
      this.isLoaded = true
      this.spinner.hide();
    }
  }

  onScroll(): void {
    const renderedRange = this.virtualScroll.getRenderedRange();
    const end = renderedRange.end;
    const total = this.items.length;
    const nextRange = end + 1;
    if (end == total && !this.fetchedRanges.has(nextRange)) {
      this.items = [...this.items, ...this.loadData(nextRange, this.pageSize)];
      this.fetchedRanges.add(nextRange);
    }
  }

  focusOnAnItem() {
    this.virtualScrollNfx.scrollInto(this.items[this.number - 1]);
    // this.virtualScrollNfx.scrollToIndex(());
  }

  private loadData(start: number, size: number): string[] {
    return this.imagesArray.slice(start - 1, (start - 1) + size)
  }

  protected fetchMore(event: IPageInfo) {
    if (event.endIndex !== this.items.length - 1) return;
    if (this.fetchedRanges.has(event.endIndex)) return;
    console.log('api------call')

    this.loading = true;
    this.fetchNextChunk(this.items.length, 1).then(chunk => {
      this.fetchedRanges.add(event.endIndex)
      this.items = this.items.concat(chunk);
      this.loading = false;
    }, () => this.loading = false);
  }

  protected fetchNextChunk(skip: number, limit: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      resolve(this.imagesArray.slice(skip, limit + skip))
    });
  }

}
