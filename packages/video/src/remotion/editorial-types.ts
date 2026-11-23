export type EditorialCaption={text:string;start:number;end:number};
export type EditorialScene={
 id:string;kind:'source'|'document'|'decision';start:number;end:number;
 headline:string;eyebrow:string;sourceId:string;sourceName:string;
 image?:{src:string;width:number;height:number;focus:{x:number;y:number;width:number;height:number}};
 excerpt?:string;excerptKind?:'source_excerpt'|'approved_claim';caption:EditorialCaption[];scriptApproved:boolean;storyboardApproved:boolean;
 documentSteps?:string[];decisionText?:string;decisionActions?:string[];decisionRevealSec?:number;
};
export type EditorialFilm={version:'editorial_v1';brand:string;duration:number;scenes:EditorialScene[];endCard?:{start:number;title:string;line:string;url?:string}};
