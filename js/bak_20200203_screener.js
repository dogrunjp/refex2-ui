//screener.js 0.1.20200127
// remote bloodhound service version
(function () {
    // screenerで取得した遺伝子リスト。各フォームの値を検証しまとめたidリスト。
    var filtered_id = [], gids = [], gene_info, wait = 200;
    // Search for G & Sで選択した遺伝子
    var gselected ="";



    // tagから参照するため、global変数として定義
    project = "fantom5", organism = "human";
    var api_base = refex_api + "screen?project=" + project +"&organism=" + organism;
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
    /*
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
    */

    // remote suggestion serviceを利用する場合
    var bl_gene_info = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('Symbol', 'value', 'id', 'alias'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote:{
                wildcard:'%QUERY',
                url:refex_api + 'suggest?query=%QUERY',
                //url: 'http://localhost:8080/suggest?query=%QUERY',
                transform: function (response) {
                    gene_info = response.results;
                    return $.map(gene_info, function (bl) {
                        return {
                            value: bl
                        }
                    });
                }
            }
        });


    // typeahead
    //bl_gene_info.initialize();


    // 動的なサービスを利用する場合
    var th = $('#refex .typeahead').typeahead(null, {
            name: 'gene_info',
            limit: 5000,
            display: 'value',

            templates: {
                empty: 'input gene name, id, or official symobol',
                // suggestionのhtmlから候補となるgene_idを取得するため、idの位置（最後）は変更しない
                //suggestion: Handlebars.compile('<div><span class="symbol">{{Symbol}}</span> ( {{value}}　({{alias}}), NCBI_GeneID: {{id}} )</div>')
                suggestion: function (data) {
                    // Handlebar使わない方法
                    var symbol = data.value.symbol,
                        alias = data.value.alias,
                        id = data.value.entrezgene,
                        name = data.value.name;
                    return `<div><span class="symbol">${symbol}</span> (${name} ${alias},  NCBI_GeneID: ${id} )</div>`
                }
            },
            source: bl_gene_info
        }
    );

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

    // Gene IDs inputに入力があった場合の逐次処理をcall
    $('input[name="gene_id_list"]').on('input', function (e) {
        // returnでtypeaheadのinput formを閉じる
        screener();
    });

    // typeahead フォーカスを離れたさいの処理
    $('input.tt-input').blur(function () {
        $(".tt-suggestion").each(function(i, o){
            //console.log($(o).text());
        })
    });

    // typeahead入力があった際に逐次呼び出す処理。検索結果の数を表示する関数を呼ぶ
    $('input.tt-input').on('input', function (e) {
        //apiのresponseを待つためsetTimeoutを使う
        // typeaheadのtt-menuのイベントにbindできるならその方がbetter
        setTimeout(screener(), wait);
    });


    document.addEventListener('keydown', function (e) {
        if (e.key == 'Enter'){
            $('#refex .typeahead').typeahead('close');
        }
    });


    // Find Genes ボタンを押したさいの処理
    $("#find_genes").click(function () {
        // portfolioコンポーネントにgene id + を表示。
        var url = get_api_parameter()
        // url = url + "&list=True"
        // get_numfound(url)
        show_gene_ids();

    });

    // project, organismsを選択した際、変数を変更する
    function project_selected(){}

    screener = function screener_handler(j=[]) {
        //console.trace()

        // 入力または検索されたNCBI_GeneIDリスト
        var i = suggested_ids();

        // 特異的発現遺伝子のリスト。発現特性からの検索でない場合は、storeのオブジェクトを参照する
        //j = j ? j : store.specific_exp;

        if (i.length > 0 & j.length > 0){
            var total = intersection(i, j)
            var total_num = total.length;
            show_numfound(total_num)
        }else if (i.length > 0){
            var total = i;
            var total_num = total.length;
            show_numfound(total_num)
        }else if(j.length > 0) {
            var total = j;
            var total_num = total.length;
            show_numfound(total_num)
        }else if (j.length == 0 && i.length == 0){
            total = [];
            // 0件が返る検索結果であれば0を引数としてAPIを検索しないだめ
            show_numfound(0)
        }else{
            // 初期状態の総データ数の取得
            // total = []は本来は正しく無く、全件が入るのがただしい
            total = [];
            var url = get_api_parameter();
            get_numfound(url);
        }
        gids = total;

    }

    // screener apiに渡すパラメータを生成し返す
    get_api_parameter = function create_api_params() {
        // search for Gene name and Symbol
        // orsuggestされたIDを取得
        var ids = suggested_ids();

        // ids option生成
        if (ids != ""){
            var gene_ids_option = "&ids=" + ids;
        }else{
            var gene_ids_option = ""
        }


        var url = api_base + gene_ids_option;
        return url
    };
    function intersection(arr1, arr2) {
        var rtn = arr1.filter(function(elm) {
            return arr2.includes(elm); });
        return rtn;
    }

    //typeaheadでsuggestされたidをカンマ区切りで連結した文字列としてかえす
    function parse_registered_ids() {
        var ids = [];
        if (gselected != ""){
            var i = gselected
        }else{
            $("#refex div.tt-suggestion").each(function(i, o){
                // div.tt-sugestion.tt-selectionの文字列をパースしてidを取得しているのでidは常に最後に記述する!!
                var i = $(o).text().split(':').slice(-1)[0];
                i = i.replace(/\s+/g, '');
                i = i.replace(/\)/, '');
                ids.push(i)
            });
        }
        return ids
    }

    // your gene list(input#gene_id_list)とSearch for gene name ＆Symobl
    // に入力された値を取得しidを連結した文字列を返す
    /*
    改修1：JSONのデータソースはDBの更新で同期するため、
    APIへの問い合わせが必要なのはGene Listのみ、余計な通信を発生させない。
    改修1.5：Gene listの値のみ問い合わせの処理を挟む（get_numfound(screen?)）。
    改修2：文字列に変換したidsを返すのではなく、配列として返す。idの合成は
    api_parameter()にまかす
    改修3：二つのフォームから得たgeneIDリストにまとめ配列として返す

     */
    function suggested_ids(){
        /*
        // "Gene ID list"に入力された値
        // check_gene_list（）で確認
        */
        var i = $('input[name="gene_id_list"]').val();
        i = i.replace(/\s+/g, "");
        i = i.split(',', []);
        i = check_gene_list(i);

        /*
        parse_registered_ids: typeageadの候補とiを取得
        */
        var j = parse_registered_ids();
        var ij = i.concat(j)
        // カンマ区切りのidリストを返す
        return ij
    }

    function check_gene_list(ids){
        // 入力したNCBI_GeneIDがDBに登録されているようであればidを返す
        return ids
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
                   //res_ids = data["gene_id"]
                }
            }
        )
    };

    set_numfound = function(ids){
        filtered_id = ids;
        show_numfound(ids.length);
        gids = ids;
        //res_ids = ids;
   };


    //portfolioにgidsを渡し、描画処理をキック
    function show_gene_ids(){
        // gene_infoはbloodhoundで取得した検索結果
        var ginfs = gene_info;
        obs.trigger("listUpdated", ginfs)
        obs.trigger("projectSelected", {"project":project, "organism":organism})
    }

     show_numfound = function(n) {
        $("#screener_found").text(n)
    }

    // numfounds 初期値を表示
    var url = get_api_parameter();
    get_numfound(url);



})();

