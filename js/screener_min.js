//screener_min.js 0.1
(function () {
    /*
     * オートコンプリートの定義, summaryデータ取得
     */
    var org = $("[name=orgs]:checked").val();
    //target_data_set = './data/refex_gene_info_' + org + '.json';

    // bloodhoudオブジェクトを定義
    var bl_gene_info = function (path) {
        return new Bloodhound({
            limit: 20,
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value', 'id', 'Symbol'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            prefetch: path,
            identify: function (obj) {
                return obj.id;
            }
        })
    };

    // typeahead
    /*
     * UIイベント定義
     * ！！利用するソースの初期化する
     */
    var gene_info = bl_gene_info('../data/refex_gene_human.json');
    //var gene_info_mouse = bl_gene_info('./data/refex_gene_mouse.json');


    // オートコンプリートを初期化
    gene_info.initialize();
    //gene_info_mouse.initialize();


    var th = $('#refex .typeahead').typeahead(null, {
        name: 'gene_info',
        limit: 1000,
        display: 'value',
        templates:{
              empty:'input gene name, id, or official symobol',
              suggestion: Handlebars.compile('<div>Name: {{value}} ,Symbol: {{Symbol}} ,ID: {{id}}</div>')
            },
        source: gene_info.ttAdapter()
    });
;

    // typeahead('destroy')して、sourceにbloodhound objを指定し再定義
    function change_source(g) {
        var target = eval('gene_info_' + g);
        th.typeahead('destroy');
        th.typeahead(null, {
            name: 'gine_info',
            limit: 1000,
            display: 'value',
            templates:{
              empty:'input gene name, id, or official symobol'
            },
            source: target.ttAdapter()
        })
    }


    //typeaheadで特定の行を選択した際の挙動
    $('#refex .typeahead').bind('typeahead:select', function (e, suggestion) {
        var gid = suggestion.id;
        var name = suggestion.value;
        var sym = suggestion.Symbol;
        //get_similar_info(gid,name,sym)
        window.get_similar_info(gid,name,sym)

    });


})();

