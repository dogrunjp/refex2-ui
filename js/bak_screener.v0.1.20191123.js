//screener.js 0.1
(function () {
    // screenerで取得した遺伝子リスト。各フォームの値を検証しまとめたidリスト。
    var filtered_id = [];
    var gids;
    // Search for G & Sで選択した遺伝子
    var gselected ="";
    // screenerの変数。
    // !!projectとorganismパラメータは必須
    // project, organismは選択可能な変数。ルートの変数とする。

    // tagから参照するため、global変数として定義
    project = "fantom5", organism = "human",
    api_base = refex_api + "screen?project=" + project +"&organism=" + organism;
    var screen_option = "",
    gene_ids, res_ids,stats_option, stats_operator, stats_val, specific, project, organism;
    // async設定を同期に変更する
    $.ajaxSetup({async: false});


    /*
     * オートコンプリートの定義, summaryデータ取得
     */
    var org = $("[name=orgs]:checked").val();
    //target_data_set = './data/refex_gene_info_' + org + '.json';

    // bloodhoudオブジェクトを定義
    var bl_gene_info = function (path) {
        return new Bloodhound({
            limit: 20,
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('Symbol', 'value', 'id', 'alias'),
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
    var gene_info = bl_gene_info('./data/refex_gene_human.json');
    //var gene_info_mouse = bl_gene_info('./data/refex_gene_mouse.json');


    // オートコンプリートを初期化
    gene_info.initialize();
    //gene_info_mouse.initialize();


    var th = $('#refex .typeahead').typeahead(null, {
        name: 'gene_info',
        limit: 5000,
        display: 'value',
        templates:{
              empty:'input gene name, id, or official symobol',
              suggestion: Handlebars.compile('<div><span class="symbol">{{Symbol}}</span> ( {{value}}　({{alias}}), NCBI_GeneID: {{id}} )</div>')
            },
        source: gene_info.ttAdapter()
    });

    // typeahead('destroy')して、sourceにbloodhound objを指定し再定義
    function change_source(g) {
        var target = eval('gene_info_' + g);
        th.typeahead('destroy');
        th.typeahead(null, {
            name: 'gine_info',
            limit: 5000,
            display: 'value',
            templates:{
              empty:'input gene name, id, or official symobol'
            },
            source: target.ttAdapter()
        })
    }


    //typeaheadで特定の行を選択した際の挙動
    $('#refex .typeahead').bind('typeahead:select', function (e, suggestion) {
        gid = suggestion.id;
        //org = $("[name=orgs]:checked").val();
        //ginf = {gid: gid, name: this.value, symbol: suggestion.Symbol, organism: org};
        //if(!r_infs[gid]) get_refex_info(gid);
        //gselected = ginf.gid;
        //var url = create_api_parms();
        //get_numfound(url)
        window.open("gene/chart.html?gid=" + gid + "&project=" + project + "&organism=" + organism)
    });

    //
    // refex_screener
    //

    // optionにsample_dictの値（ex. cage_human_sample_map）を追加
    for(var i in sample_dict) {
        if(sample_dict[i].id != null){
            $("#specificity").append("<label><input type='checkbox' name='sample' value=" + sample_dict[i].sample + ">" + sample_dict[i].value + "</label> ")
        }
    }

    // Gene IDs inputに入力があった場合の逐次処理をcall
    $('input[name="gene_id_list"]').on('input', function () {
        url = create_api_parms();
        get_numfound(url);
    });

    $('input[name="sample"]').on('change', function () {
        url = create_api_parms();
        get_numfound(url);
    })


    $('input[name="stats_value"]').on('input', function () {
        url = create_api_parms();
        get_numfound(url);
    });

    // typeahead フォーカスを離れたさいの処理
    $('input.tt-input').blur(function () {
        $(".tt-suggestion").each(function(i, o){
            //console.log($(o).text());
        })
    });

    // typeahead入力の際に逐次呼び出す処理
    $('input.tt-input').on('input', function (e) {
        // 新しく入力があった場合gselectedを初期化する
        gselected = "";
        var url = create_api_parms();
        get_numfound(url);

        reset_crossfilter();
        // キーワード検索で該当するidsがfilterdstats()にわたされ、該当する遺伝子の発現statsが返る
        var sts = filteredstats(suggested_ids());
        addcrossfilter(sts);
    });

    // Find Genes ボタンを押したさいの処理
    $("#find_genes").click(function () {
        // portfolioコンポーネントにgene id + を表示。
        var url = create_api_parms()
        url = url + "&list=True"
        get_numfound(url)
        show_gene_ids();
         //
         //$(".tt-suggestion").each(function(i, o){
            //console.log($(o).text());
        //})
    });

    // project, organismsを選択した際、変数を変更する
    function project_selected(){}

    // screener apiに渡すパラメータを生成する
    function create_api_parms() {

        // Sample specificityの値を取得
        // !!!!!Sampleは複数選択したいので、specifiはカンマ区切りで連結する（APIの対応が必要）!!!!!!!!!
        var specific = "";
        $('input[name="sample"]:checked').each(function(){
            specific = $(this).val();
        });

        // 入力orsuggestされたIDを取得
        var ids = suggested_ids();

        // Statistics option生成  // 廃止
        var stats = "";

        // ids option生成
        if (ids != ""){
            var gene_ids_option = "&ids=" + ids;
        }else{
            var gene_ids_option = ""
        }

        // samplespecificity option生成
        if (specific != "") {
            var specificity_option = "&specific=" + specific
        }else{
            var specificity_option = ""
        }

        var url = api_base + gene_ids_option + specificity_option + stats;
        return url
    }

    //typeaheadでsuggestされたid
    function parse_registered_ids() {
        var ids = [];
        if (gselected != ""){
            var i = gselected
        }else{
            $(".tt-suggestion").each(function(i, o){
                // div.tt-sugestion.tt-selectionの文字列をパースしてidを取得しているのでidは常に最後に記述する!!
                var i = $(o).text().split(':').slice(-1)[0]
                i = i.replace(/\s+/g, '');
                i = i.replace(/\)/, '');
                ids.push(i)
            });
            var i = ids.join(",");
        }
        return i
    }

    // Gene IDs(input#gene_id_list)とSearch for G＆Sに入力された値を取得し
    // gene idを連結した文字列を返す
    function suggested_ids(){
        // "Gene IDs"に入力された値
        var i = $('input[name="gene_id_list"]').val();

        // crossfilterされたidリストがある場合
        if (filtered_id.length > 0){
            var opt = filtered_id;
        }
        // parse_registered_ids: typeageadの候補とiを取得
        else if (i && parse_registered_ids()){
            var opt = i + "," + parse_registered_ids()
        }else if(i){
            var opt = i
        }else if (parse_registered_ids()){
            // キーワード検索に入力がある場合
            var opt = parse_registered_ids()
        }else{
            //初期状態
            opt = ""
        }
        // カンマ区切りのidリストを返す
        return opt
    }

    //screener apiへの問い合わせ、"Estimated Results"の更新処理をキックする
    get_numfound = function(url){
        $.getJSON(
            url,
            null,
            function (data, status) {
                gids = data["gene_id"];
                var numfound = data["numfound"];
                show_numfound(numfound);
                if (data["numfound"] != 0){
                   res_ids = data["gene_id"]
                }
            }
        )
    };

    set_numfound = function(ids){
        filtered_id = ids;
        show_numfound(ids.length);
        gids = ids;
        res_ids = ids;
   };

    //portfolioにgidsを渡し、描画処理をキック
    function show_gene_ids(){
        // gene_info（bloodhoundオブジェクト）にidリストを当てると、idに該当するginfsのリストが返る
        var ginfs = gene_info.get(gids);
        obs.trigger("listUpdated", ginfs)
        obs.trigger("projectSelected", {"project":project, "organism":organism})
    }

     show_numfound = function(n) {
        $("#screener_found").text(n)
    }

    // numfounds 初期値を表示
    var url = create_api_parms();
    get_numfound(url);


})();

