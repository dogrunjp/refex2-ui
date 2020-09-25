//refex_rdf_query.0.1.js

var refex_cash_api = 'http://52.193.15.45/dist/',
//var refex_cash_api = 'http://0.0.0.0:8080/dist/',
endpoint = 'https://integbio.jp/rdf/sparql',
refex_api = 'http://52.193.15.45/';

var query_all_sample_ref = function(){
    return `
    PREFIX refexo: <http://purl.jp/bio/01/refexo#>
    PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX refexs: <http://refex.dbcls.jp/sample/>
    SELECT DISTINCT ?sample ?uberon ?cell ?fantom ?disease
    WHERE {
     ?sample refexo:sampleReference [refexo:sample ?fantom] .
         OPTIONAL {
             ?sample  refexo:sampleReference [refexo:belongsToDevelopmentSite ?uberon] ;
              refexo:sampleReference [refexo:belongsToCellType ?cell] ;
              refexo:sampleReference [refexo:belongsToDisease ?disease] .
         }
    }
    `
};

var refex_info_api = function (g, ginf) {
    var u =  refex_cash_api + g;
    $.getJSON(u,function (d) {
        summary_chart(ginf, d, g);
        store_data(ginf, d)
    })

};


var get_all_sample = function() {
        var qs = encodeURIComponent(query_all_sample_ref());
        var q = endpoint + "?query=" + qs;

        d3.request(q)
            .header('Accept', 'application/sparql-results+json')
            .response(function(xhr){return JSON.parse(xhr.responseText)})
            .get(function(d){create_sample_ref(d.results.bindings)});
    };

var query_refex_info = function (g) {
    return `
      PREFIX ncbi-gene:  <http://www.ncbi.nlm.nih.gov/gene/>
        PREFIX refexo: <http://purl.jp/bio/01/refexo#>
        PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
        SELECT DISTINCT ?refex ?sample ?expression_value ?sample_category ?description
        WHERE {
        ?refex  rdfs:seeAlso ncbi-gene:${g};
        refexo:expValue ?expression_value;
        refexo:refexSample ?sample .
        ?sample refexo:refexSampleCategory ?sample_category;
        refexo:refexRefinedDescription ?description
        }`
};

var sample_refs = [];
var sample_ref = {};

function create_sample_ref(a) {
    var arr =  a.map(function (d) {
        return {
            'sample': D(d, 'sample'),
            'cell': D(d, 'cell'),
            'fantom': D(d, 'fantom'),
            'uberon': D(d, 'uberon'),
            'disease': D(d, 'disease')
        }
    });
    //sampleの値でオブジェクトをネストする

    sample_refs = d3.nest().key(function (d) {return d.sample}).entries(arr);
    sample_refs.forEach(function(obj){
        //sample = obj.key
        var dct = {};
        dct['cell'] = [];
        dct['fantom'] = [];
        dct['disease'] = [];
        dct['uberon'] = [];
        obj.values.forEach(function(d){
            dct['cell'].push(d['cell']);
            dct['fantom'].push(d['fantom']);
            dct['disease'].push(d['disease']);
            dct['uberon'].push(d['uberon']);
        });
        dct['cell'] = Array.from(new Set(dct['cell']));
        dct['fantom'] = Array.from(new Set(dct['fantom']));
        dct['disease'] = Array.from(new Set(dct['disease']));
        dct['uberon'] = Array.from(new Set(dct['uberon']));
        sample_ref[obj.key] = dct;

    });

}

// URIからリテラルな値を返す
function D(e, k){
    try{
        var d = e[k]['value'].split('/').slice(-1).pop()
    }catch(e){
        var d = ''
    }
    return d
}
