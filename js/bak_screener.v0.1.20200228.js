//screener.js 0.1.20200127
// remote bloodhound service version
(function () {
    // screenerで取得した遺伝子リスト。各フォームの値を検証しまとめたidリスト。
    var filtered_id = [], gids = [], gene_info = [], wait = 300, default_num, your_gene_list = [];
    // Search for G & Sで選択した遺伝子
    var gselected ="",

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
    // remote suggestion serviceを利用する場合
    var bl_gene_info = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('Symbol', 'value', 'id', 'alias'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote:{
                wildcard:'%QUERY',
                url:refex_api + 'suggest?query=',
                //url: 'http://localhost:8080/api/suggest?query=',
                replace: function (url, uriEncodedQuery) {
                    var res = url + uriEncodedQuery + query_option();
                    return res
                },
                transform: function (response) {
                    gene_info = response.results;
                    return $.map(gene_info, function (bl) {
                        return bl
                    });
                }
            }
        });


    // typeahead
    //bl_gene_info.initialize();

    // 動的なサービスを利用する場合
    var th = $('#refex .typeahead').typeahead(null, {
            name: 'gene_info',
            limit: 20000,

            templates: {
                empty: 'input gene name, id, or official symobol',
                // suggestionのhtmlから候補となるgene_idを取得するため、idの位置（最後）は変更しない
                //suggestion: Handlebars.compile('<div><span class="symbol">{{Symbol}}</span> ( {{value}}　({{alias}}), NCBI_GeneID: {{id}} )</div>')
                suggestion: function (data) {
                    // Handlebar使わない方法
                    var symbol = data.symbol,
                        alias = data.alias,
                        id = data.entrezgene,
                        name = data.name;
                    return '<div><span class="symbol">' + symbol + '</span> (' + name + ' ' + alias + ',  NCBI_GeneID: ' + id + ' )</div>'
                }
            },
            source: bl_gene_info,
            display: 'symbol'
        }
    );

    // typeahead('destroy')して、sourceにbloodhound objを指定し再定義
    function change_source(g) {
        var target = eval('gene_info_' + g);
        th.typeahead('destroy');
        th.typeahead(null, {
            name: 'gine_info',
            limit: 10000,
            display: 'value',
            templates:{
              empty:'input gene name, id, or official symobol'
            },
            source: target.ttAdapter()
        })
    }


    //typeaheadで特定の行を選択した際の挙動
    $('#refex .typeahead').bind('typeahead:select', function (e, suggestion) {
        var gid = suggestion.entrezgene;
        //org = $("[name=orgs]:checked").val();
        //ginf = {gid: gid, name: this.value, symbol: suggestion.Symbol, organism: org};
        //if(!r_infs[gid]) get_refex_info(gid);
        //gselected = ginf.gid;
        //var url = create_api_parms();
        //get_numfound(url)
        //$('#refex .typeahead').typeahead("val", "")

        window.open("gene/chart.html?gid=" + gid + "&project=" + project + "&organism=" + organism)
    });

    // Gene IDs inputに入力があった場合の逐次処理をcall
    $('input[name="gene_id_list"]').on('input', function () {
        screener();
    });

    // typeahead フォーカスを離れたさいの処理
    $('input.tt-input').blur(function () {
        $(".tt-suggestion").each(function(i, o){
            //console.log($(o).text());
        })
    });

    // typeahead入力の際に逐次呼び出す処理
    $('input.tt-input').on('input', function (e) {
        setTimeout('screener()', wait)
    });

    // enterを押した時の挙動
    document.addEventListener('keydown', function (e) {
        if (e.key == 'Enter'){
            if($('.tt-menu').css('display') == 'block'){
                $('#refex .typeahead').typeahead('close');
                url = get_api_parameter();
                show_gene_ids();
            }
        }
    });

    // Find Genes ボタンを押したさいの処理
    $("#find_genes").click(function () {
        show_gene_ids();
    });


    var drop_holder = document.getElementById('drop_holder'),
    state = document.getElementById('status');

    if (typeof window.FileReader === 'undefined') {
        state.className = 'fail';
    } else {
        state.className = 'success';
        state.innerHTML = '';
    }

    drop_holder.ondragover = function () {
        this.className = 'hover';
        return false;
    };
    drop_holder.ondragend = function () {
        this.className = '';
        return false;
    };
    drop_holder.ondrop = function (e) {
        this.className = '';
        e.preventDefault();

        var file = e.dataTransfer.files[0],
            reader = new FileReader();
        reader.onload = function (event) {
                var ids = event.target.result;
                var id_str = ids.replace(/\r?\n/g, ',');
                id_str = id_str.length > 50 ? id_str.slice(0, 50)+"..." : id_str;
                drop_holder.innerText = id_str;
                get_gene_list(ids);
                screener()
            };
        reader.readAsText(file);
        return false;
    };

    // 値のクリア
    $("#empty_gl").on("click", function () {
        drop_holder.innerText = "Drop your file";
        your_gene_list = [];
        screener();
    });

    function get_gene_list(s){
        s = s.trim();
        your_gene_list = s.split(/\r\n|\n|\t|,/)
    }

    // project, organismsを選択した際、変数を変更する
    function project_selected(){}

    screener = function screener_handler() {
        // リストでされたまたは検索されたNCBI_GeneIDリスト
        var i = suggested_ids();

        // 特異的発現遺伝子のリスト。発現特性からの検索でない場合は、storeオブジェクト（gene idリスト）を参照する
        var j = store.specific_exp;

        var is_null = is_input_null();
        if (is_null){
            // tt-inputの値がnullであれば初期状態の検索結果の数をshow_numfoundに渡す
            show_numfound(default_num);
            // portfolioを初期化する
            total = [];
            // bloodhoundの結果を初期化
            gene_info = [];
        } else if (i.length > 0 & j.length > 0){
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
        }
        gids = total;
    };

    // 全てのフォームの入力がnullであればTrueを返す
    function is_input_null() {
        // tt-inputの値 空であればnull、入力があれば文字列
        var tt_input = $("input.tt-input").val()
        // search for sample specific gene の選択
        var annotations = $(".panel.annotation .cv").length;

        if (!tt_input && !annotations && !your_gene_list){
            return true
        }else{
            return false
        }
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
        // "Your Gene ID list"に入力された値
        // check_gene_list（）でパースしarrayとして取得
        */
        var i = your_gene_list;

        /*
        parse_registered_ids: typeageadの候補とiを取得
        */
        var j = parse_registered_ids();

        if(j.length != 0 && i.length == 0){
            // キーワード検索（i）しか入力されていない場合
            return j
        }else if(i.length != 0 && j.length == 0) {
            // your gene listしか入力が無い場合
            return i
        }else if (i.length == 0 && j.length == 0){
            return []
        }else {
            // 積集合を計算
            var ij = i.filter(function (d) {
                return j.indexOf(d) !== -1
            })

            return ij
        }
    }

    function check_gene_list(ids){
        // 入力したNCBI_GeneIDがDBに登録されているようであればidを返す
        return ids
    }

    // 選択された検索オプションを取得し、クエリパラメータを返す
    function query_option(){
        var is_summary_checked = $("#is_summary").is(":checked");
        var is_go_checked = $("#is_go").is(":checked");
        var options = [];
        if (is_summary_checked){
            options.push("summary=True")
        };
        if (is_go_checked){
            options.push("go=True")
        }
        if (options.length == 0){
            return ""
        }else{
           options = options.join("&")
           var res = "&" + options;
           return res
        }
    }

    //screener apiへの問い合わせ、"Estimated Results"の更新処理をキックする
    get_numfound = function(url){
        $.getJSON(
            url,
            null,
            function (data, status) {
                gids = data["gene_id"] ? data["gene_id"]: [];
                var numfound = data["numfound"];
                default_num = default_num ? default_num:numfound;
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
        //res_ids = ids;
   };

    //portfolioにgidsを渡し、描画処理をキック
    function show_gene_ids(){
        /*
        gene_info: bloodhoundで取得した遺伝子情報 グローバル変数
        gids: screeenerの検索結果のidの積集合 グローバル変数
        ginfs: portfolioに表示する遺伝子情報のデータ
         */
        var ginfs = [];

        // 1. gene_infoが空でかつgidsがある場合gidsからportfolio.tagのリスト表示に必要な遺伝子の情報を取得しginfsに渡す
        // 2. gene_infoがからでなく、かつgidsの長さと等しく無い場合gene_infoをgidsでフィルターする
        // 3. gene_infoとgidsの長さが等しい（特異的発現の検索結果が無い場合）ginfs = gene_info
        var gl = gene_info.length;
        var gi = gids.length;
        if (gl == 0 & gi != 0) {
            // your_gene_listかsample特異性で得られたidリストのみのためgene
            var gid_str = gids.join();
            var url = refex_api + "infos?ids=" + gid_str;
            fetch(url)
                .then(function (res) {
                    return res.json();
                })
                .then(function (d) {
                    ginfs = d;
                    obs.trigger("listUpdated", ginfs)
                    obs.trigger("projectSelected", {"project":project, "organism":organism})
                });

        }else if(gl === gi){
            ginfs = gene_info.filter(function (d) {
                return gids.indexOf(d.entrezgene) >= 0
            });
            obs.trigger("listUpdated", ginfs)
            obs.trigger("projectSelected", {"project":project, "organism":organism})
        }else if (gi != 0 & gl != gi){
            ginfs = gene_info.filter(function (d) {
                return gids.indexOf(d.entrezgene) >= 0
            });
            obs.trigger("listUpdated", ginfs)
            obs.trigger("projectSelected", {"project":project, "organism":organism})
        }else{
            ginfs = gids.map(function (d) {
                return {"entrezgene": d}
            })
            obs.trigger("listUpdated", ginfs)
            obs.trigger("projectSelected", {"project":project, "organism":organism})
        }

    }


     show_numfound = function(n) {
        $("#screener_found").text(n)
    };

    // numfounds 初期値を表示
    var url = get_api_parameter();
    get_numfound(url);


})();

