// Replace these explicitly labelled samples with your own photographs. No API or credentials.
window.ORBIT_PHOTOGRAPHY = Object.freeze({
  categories: Object.freeze(['四时', '街巷', '远方', '片刻']),
  works: Object.freeze([
    ['mountain','山的另一面','远方',1600,1067,'光落在山脊，远处不必有答案。'],
    ['forest','绿意之间','四时',1600,1067,'让目光在树影中，停留一会儿。'],
    ['street','天色渐晚','街巷',1600,1067,'城市安静下来的时候，才听见自己的脚步。'],
    ['sea','海的呼吸','片刻',1600,1067,'一次潮汐，一段没有被催促的时间。'],
    ['dunes','风经过的地方','远方',1600,1060,'没有留下脚印，也算抵达。'],
    ['lake','在日常之外','四时',1600,2641,'那些不需要命名的，仍值得被看见。']
  ].map(([id,title,category,width,height,description],i)=>Object.freeze({
    id,title,category,width,height,description,displayOrder:i+1,date:'',location:'',
    image:`./public/earth/images/${id}-1600.jpg`,thumbnail:`./public/earth/images/${id}-480.jpg`,
    sources:[480,960,1600].map(w=>({width:w,url:`./public/earth/images/${id}-${w}.jpg`})),
    placeholder:true,credit:'占位摄影 · Unsplash',
    // Descriptions are demonstration editorial text, not the photographer’s original notes.
    descriptionLabel:'示例随笔'
  })))
});
