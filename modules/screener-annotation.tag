<screener-annotation>
<label>Search for genes that are specifically expressed in a given sample by classification</label>
    <div id="sample_type_filter" class="navbar-form">
        <div class="panel panel-default annotation">
            <div class="panel-body">
                <div class="annotation-name">Sample types by FANTOM5 </div>
                <div class="navbar-form ">
                    <div id="sample_type" class="input-group sample">
                        <div class="input-group-btn"></div>

                        <input type="Search" id="Sample types category" placeholder="Input term (e.g. cell lines, stem cells, tissues..)" class="form-control typeahead"/>
                        <input type="hidden" value="">

                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="cell_ongology_filter" class="navbar-form">
        <div class="panel panel-default annotation">
            <div class="panel-body">
                <div class="annotation-name">Cell types by Cell Ontology </div>
                <div class="navbar-form">
                    <div id="cell_ontology" class="input-group sample">
                        <div class="input-group-btn"></div>

                        <input type="Search" id="CL label" placeholder="Input term (e.g CD14, epthelial, muscle...)" class="form-control typeahead"/>
                        <input type="hidden"value="">

                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="tissue_type_filter" class="navbar-form">
        <div class="panel panel-default annotation">
            <div class="panel-body">
                <div class="annotation-name">Anatomical structures by UBERON </div>
                <div class="navbar-form">
                    <div id="tissue_type" class="input-group sample">
                        <div class="input-group-btn">
                                <div class="dropdown-menu">
                                  <a class="dropdown-item" href="#">One by one</a>
                                  <a class="dropdown-item" style="color: #999">In a group</a>
                                </div>
                        </div>
                        <input type="Search" id="UBERON label" placeholder="Input term (e.g. skin, muscle, blood..)" class="form-control typeahead"/>
                        <input type="hidden" value="">
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="ncit_label_filter" class="navbar-form">
        <div class="panel panel-default annotation">
            <div class="panel-body">
                <div class="annotation-name">Biomedical concepts by NCI Thesaurus (NCIt) </div>
                <div class="navbar-form">
                    <div id="ncit_label" class="input-group sample">
                        <div class="input-group-btn">
                                <div class="dropdown-menu">
                                  <a class="dropdown-item" href="#">One by one</a>
                                  <a class="dropdown-item" style="color: #999">In a group</a>
                                </div>
                        </div>
                        <input type="Search" id="NCIT label" placeholder="Input term (e.g. leukemia, carcinoma, tumor..)" class="form-control typeahead"/>
                        <input type="hidden" value="">
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        var self = this;
        // sample Specific geneを検索するためのアノテーション
        var annotation_used = []; // [{"annotation": "Sample type category", "value": "tissues"}, ]
        var selected_gene = [];
        var extra_filter = [];
        var filter_ids = [];
        var extra_annotation_values = {};
        var delay = 200;
        /*
        組織特的発現による遺伝子filter
        */
        //window.onload = function(e){
        window.onload = setTimeout(tag_onload, delay);
        //$(document).ready(function () {
        function tag_onload() {
            console.log("screener-annotation, L93")
            // extra_annotation を描画
            self.annotation_names = human_fantom5_annotations.map(function (obj) {
                return obj.title
            });

            /* typeahead 設定 */
            var bl_sample_type = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.whitespace,
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: ["cell lines", "stem cells", "primary cells","tissues"]
            });

            var bl_cell_ontology = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.whitespace,
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                prefetch: 'http://refex2-api.bhx.jp/api/vocablary?annotation=CL%20label'
            });
            var bl_tissue_type= new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.whitespace,
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                prefetch: 'http://refex2-api.bhx.jp/api/vocablary?annotation=UBERON%20label'
            });
            var bl_nict_label= new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.whitespace,
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                prefetch: 'http://refex2-api.bhx.jp/api/vocablary?annotation=NCIT%20label'
            });
    $('#sample_type .typeahead').typeahead(null, {
        name: 'sample_types',
        source:bl_sample_type
    });
    $('#cell_ontology .typeahead').typeahead(null, {
        limit:25,
        source: bl_cell_ontology
    });
    $('#tissue_type .typeahead').typeahead(null, {
        limit: 25,
        source: bl_tissue_type
    });
    $('#ncit_label .typeahead').typeahead(null, {
        limit: 25,
        source: bl_nict_label
    });
            self.update();

            /* typeahead イベントハンドラ */
            $('.annotation input.tt-input').on('typeahead:selected', function (e) {
                var annoation = $(this).parent().context.id;
                var val = $(this).val()
                annotation_manager(annoation, val)
                show_filtered_gene()
            });

            $('.annotation input[type="Search"].tt-input').change(function (e) {
                // 空になったらannotation_usedからオブジェクトを削除する
                $('.annotation input.tt-input[type="Search"]').each(function () {
                    var v = $(this).val();
                    var annotation = this.id
                    if( !v ){
                        annotation_manager(annotation, "", true);
                    }
                });
                show_filtered_gene()

            });



            function annotation2cv(annotation) {
                var target = refex_api + "vocablary?annotation=" + annotation;
                return new Promise(function (resolve) {
                    fetch(target)
                    .then(function(response){
                        return response.json()
                    })
                    .then(function (json) {
                        resolve(json)
                    })
                })
            }


            // "select value"button（.add_selector）を隠す
            function hide_add_selector(s){
                $(s).css({"visibility":"hidden", "width": "0px", "height": "0px"});
            }

            // 選択したcvの値を表示・popoverを削除・アノテーション選択した際の結果表示プロセス呼び出し
            function show_annotation_value(annotation,selector, v) {
                var s = "#" + selector + " > .panel > .panel-body";
                $(s).append('<div class="cv">' + v + '<i class="far fa-window-close"></i></div> <!--<div class="add_sample" data-toggle="popover" data-samples="samples"><i class="fas fa-plus-square"></i>select sample</div>-->');
                // .add_sample buttonにpopover
                $('.add_sample').popover({
                    html: true,
                    container: "body",
                    content:function () {
                        var divid = "#" + $(this).data("samples")
                        return $(divid).html()
                    }
                });
                // annotation valueをクリックした際
                $(s + " .cv").click(function(){
                    // annotation_usedより削除
                    annotation_manager(annotation, "", true );

                    // .cvを削除
                    $(s + " .cv").remove();
                    $(s + " .add_sample").remove();
                    // .add_selectorを再び表示する
                    $("#" + selector + " .add_selector").css({"visibility": "visible", "width": "92px", "height": "20px"});
                    $("#" + selector + " .add_extra_selector").css({"visibility": "visible", "width": "92px", "height": "20px"});

                    if (annotation_used.length == 0){
                        store.specific_exp = 0;
                        screener(0);
                    }else{
                        show_filtered_gene();
                    }
                });

                // さらにSampleを選択する場合
                $(s + " .add_sample").click(function () {
                    // sample を表示
                })
            }

            // popoverを削除（popover("destroy")）
            function hide_annotation_popover() {
                $('[data-toggle="popover"]').popover("hide");
            }

            // 遺伝子をfilterし、結果を表示する
            function show_filtered_gene(){
                var samples = [];
                var samples_tmp = [];
                for (var obj of annotation_used){
                    var a = obj.annotation;
                    var v = obj.value;
                    samples_tmp.push(annotation2sample(a,v))
                }

                // annotationが複数であるケースもあるため,Promise.all()で非同期処理の完了を待つ
                Promise.all(samples_tmp)
                    .then(function (sids) {
                        return sids
                    })
                    .then(function (res) {
                        /*
                         アノテーションごとに得られるSampleの積集合を得る。intersection処理を
                        */
                        var samples;
                        if(res.length > 1){
                            samples = intersection(res)
                        }else{
                            samples = res;
                        }
                       // arrayを,区切りの文字列に変換
                        if(samples.length > 0){
                            var sample_str = samples.join(",");
                        }else{
                            sample_str = ""
                        }
                       // sample特異的なフラグを持つ遺伝子を取得しscreener_hander()に渡す
                       sample2gene(sample_str)
                           .then(function(res){
                               // screenerの検索ハンドラを検索結果を引数に呼び出す
                               // 0件であれば空のarray
                               store.specific_exp = res;
                               screener();
                           });
                    });
            }

            // 組織特的発現遺伝子検索で指定したすべてのfilterについて該当するsampleを取得する
            // annotation2gene()としてserver serversideの処理にした方が早いケース（集合のロジック次第）もあるかも
            function annotation2sample(annotation, value) {
                var target = refex_api + "sample?annotation=" + annotation + "&value=" + value;
                return new Promise(function(resolve) {
                    fetch(target)
                        .then(function (response) {
                            return response.json()
                        })
                        .then(function (json) {
                            resolve(json)
                        });
                });
            }

            // annotationによってフィルターされたサンプルの積集合を利用し、特異的フラグの建つ遺伝子を取得
            function sample2gene(samples) {
                var target = refex_api + "specific_gene?sample=" + samples;
                return new Promise(function (resolve) {
                    fetch(target)
                        .then(function (response) {
                            return response.json()
                        })
                        .then(function (json) {
                            resolve(json)
                        })
                })
            }

            function intersection() {
                var result = [];
                var lists;

                if (arguments.length === 1) {
                    lists = arguments[0];
                } else {
                    lists = arguments;
                }

                for (var i = 0; i < lists.length; i++) {
                    var currentList = lists[i];
                    for (var y = 0; y < currentList.length; y++) {
                        var currentValue = currentList[y];
                        if (result.indexOf(currentValue) === -1) {
                            if (lists.filter(function (obj) {
                                    return obj.indexOf(currentValue) == -1
                                }).length == 0) {
                                result.push(currentValue);
                            }
                        }
                    }
                }
                return result;
            }


            // annotation_used リストの管理
            function annotation_manager(annotation, value, remove = false){
                // すでにannotationが登録されているか
                var anns = annotation_used.map(function (obj) {
                    return obj.annotation
                })
                var i = anns.indexOf(annotation)
                if (remove===true){
                    annotation_used.splice(i, i+1);
                }else if (i >= 0 ){
                    // すでにアノテーションが存在する場合おきかえ
                    annotation_used.splice(i, i+1);
                    //delete annotation_used[i]; // delete はemptyが残るため使わない
                    annotation_used.push({"annotation": annotation, "value": value})
                }else{
                    annotation_used.push({"annotation": annotation, "value": value})
                }
            }
        };




    </script>

</screener-annotation>